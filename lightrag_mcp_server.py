"""
LightRAG MCP Server

Exposes LightRAG knowledge base operations as MCP tools so that any
MCP-compatible AI client (Claude Desktop, Cursor, etc.) can query,
insert, and manage documents in your LightRAG instance.

Usage:
    python lightrag_mcp_server.py

Configuration (via environment variables or .env file):
    LIGHTRAG_MCP_BASE_URL  - LightRAG API base URL (default: http://localhost:9621)
    LIGHTRAG_MCP_USERNAME  - Login username (default: admin)
    LIGHTRAG_MCP_PASSWORD  - Login password (default: reads from AUTH_ACCOUNTS in .env)
"""

import asyncio
import json
import os
import re
from pathlib import Path

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _load_env_file() -> dict[str, str]:
    env_path = Path(__file__).parent / ".env"
    result: dict[str, str] = {}
    if not env_path.exists():
        return result
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip("'\"")
        result[key.strip()] = value
    return result


_env = _load_env_file()

BASE_URL = os.environ.get("LIGHTRAG_MCP_BASE_URL", _env.get("LIGHTRAG_MCP_BASE_URL", "http://localhost:9621"))
MCP_USERNAME = os.environ.get("LIGHTRAG_MCP_USERNAME", _env.get("LIGHTRAG_MCP_USERNAME", "admin"))

# Derive default password from AUTH_ACCOUNTS in .env  (format: "user:pass,user2:pass2")
def _default_password() -> str:
    accounts_str = _env.get("AUTH_ACCOUNTS", "")
    for entry in accounts_str.split(","):
        entry = entry.strip()
        if ":" in entry:
            user, _, pwd = entry.partition(":")
            if user.strip() == MCP_USERNAME:
                return pwd.strip()
    return ""

MCP_PASSWORD = os.environ.get("LIGHTRAG_MCP_PASSWORD", _env.get("LIGHTRAG_MCP_PASSWORD", _default_password()))

# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

_token: str | None = None


async def get_token(client: httpx.AsyncClient) -> str:
    global _token
    if _token:
        return _token
    resp = await client.post(
        f"{BASE_URL}/login",
        data={"username": MCP_USERNAME, "password": MCP_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed ({resp.status_code}): {resp.text}")
    _token = resp.json()["access_token"]
    return _token


async def auth_headers(client: httpx.AsyncClient) -> dict[str, str]:
    token = await get_token(client)
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------

app = Server("lightrag")


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="query_knowledge",
            description=(
                "Query the LightRAG knowledge base using RAG (Retrieval-Augmented Generation). "
                "Supports multiple retrieval modes: hybrid (recommended), local (entity-focused), "
                "global (broad knowledge), naive (direct vector search)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question or search query",
                    },
                    "mode": {
                        "type": "string",
                        "enum": ["hybrid", "local", "global", "naive", "mix"],
                        "description": "Retrieval mode. 'hybrid' is recommended for most cases.",
                        "default": "hybrid",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of entities/relations to retrieve (default: 60)",
                        "default": 60,
                    },
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="insert_text",
            description="Insert a text document into the LightRAG knowledge base for processing and indexing.",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The text content to insert",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description or title for the document",
                    },
                },
                "required": ["text"],
            },
        ),
        types.Tool(
            name="list_documents",
            description="List all documents in the LightRAG knowledge base with their processing status.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status_filter": {
                        "type": "string",
                        "enum": ["all", "processed", "pending", "failed"],
                        "description": "Filter documents by status (default: all)",
                        "default": "all",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of documents to return (default: 20)",
                        "default": 20,
                    },
                },
            },
        ),
        types.Tool(
            name="get_pipeline_status",
            description="Check the current document processing pipeline status (busy, pending count, etc.).",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        types.Tool(
            name="get_graph_info",
            description="Get knowledge graph statistics: node labels, entity count, relation count.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    async with httpx.AsyncClient() as client:
        try:
            headers = await auth_headers(client)

            # ------------------------------------------------------------------
            if name == "query_knowledge":
                payload = {
                    "query": arguments["query"],
                    "mode": arguments.get("mode", "hybrid"),
                    "stream": False,
                    "top_k": arguments.get("top_k", 60),
                }
                resp = await client.post(
                    f"{BASE_URL}/query", headers=headers, json=payload, timeout=120.0
                )
                resp.raise_for_status()
                data = resp.json()
                answer = data.get("response", "")
                return [types.TextContent(type="text", text=answer or "(empty response)")]

            # ------------------------------------------------------------------
            elif name == "insert_text":
                text = arguments["text"]
                description = arguments.get("description", "")
                if description:
                    text = f"{description}\n\n{text}"
                resp = await client.post(
                    f"{BASE_URL}/documents/text",
                    headers=headers,
                    json={"text": text},
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()
                return [types.TextContent(
                    type="text",
                    text=f"Document submitted for processing.\nStatus: {data.get('status', 'unknown')}\nMessage: {data.get('message', '')}",
                )]

            # ------------------------------------------------------------------
            elif name == "list_documents":
                status_filter = arguments.get("status_filter", "all")
                limit = arguments.get("limit", 20)

                payload: dict = {"page_size": limit, "page_number": 1}
                if status_filter != "all":
                    payload["status_filter"] = [status_filter.upper()]

                resp = await client.post(
                    f"{BASE_URL}/documents/paginated",
                    headers=headers,
                    json=payload,
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()
                statuses = data.get("statuses", [])
                total = data.get("total", len(statuses))

                if not statuses:
                    return [types.TextContent(type="text", text="No documents found.")]

                lines = [f"Documents ({total} total, showing {len(statuses)}):"]
                for doc in statuses:
                    name_part = doc.get("file_path") or doc.get("id", "unknown")
                    status_part = doc.get("status", "unknown")
                    created = doc.get("created_at", "")[:10] if doc.get("created_at") else ""
                    lines.append(f"  [{status_part}] {name_part} {created}")

                return [types.TextContent(type="text", text="\n".join(lines))]

            # ------------------------------------------------------------------
            elif name == "get_pipeline_status":
                resp = await client.get(
                    f"{BASE_URL}/documents/pipeline-status",
                    headers=headers,
                    timeout=15.0,
                )
                resp.raise_for_status()
                data = resp.json()
                lines = [
                    f"Pipeline Status:",
                    f"  Busy: {data.get('busy', False)}",
                    f"  Pending documents: {data.get('pending_count', 0)}",
                    f"  Processing: {data.get('processing_count', 0)}",
                ]
                if data.get("latest_message"):
                    lines.append(f"  Latest: {data['latest_message']}")
                return [types.TextContent(type="text", text="\n".join(lines))]

            # ------------------------------------------------------------------
            elif name == "get_graph_info":
                labels_resp = await client.get(
                    f"{BASE_URL}/graph/label/list", headers=headers, timeout=15.0
                )
                labels_resp.raise_for_status()
                labels_data = labels_resp.json()

                graphs_resp = await client.get(
                    f"{BASE_URL}/graphs", headers=headers, timeout=15.0
                )
                graphs_resp.raise_for_status()
                graphs_data = graphs_resp.json()

                labels = labels_data.get("labels", [])
                node_count = graphs_data.get("node_count") or graphs_data.get("num_nodes", "unknown")
                edge_count = graphs_data.get("edge_count") or graphs_data.get("num_edges", "unknown")

                lines = [
                    "Knowledge Graph Info:",
                    f"  Nodes: {node_count}",
                    f"  Edges: {edge_count}",
                    f"  Entity labels ({len(labels)}): {', '.join(labels[:20])}{'...' if len(labels) > 20 else ''}",
                ]
                return [types.TextContent(type="text", text="\n".join(lines))]

            # ------------------------------------------------------------------
            else:
                return [types.TextContent(type="text", text=f"Unknown tool: {name}")]

        except httpx.HTTPStatusError as e:
            return [types.TextContent(type="text", text=f"API error {e.response.status_code}: {e.response.text}")]
        except Exception as e:
            return [types.TextContent(type="text", text=f"Error: {e}")]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
