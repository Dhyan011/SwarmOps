import chromadb
from chromadb.config import Settings

# Initialize in-memory ChromaDB for KB Agent RAG
chroma_client = chromadb.Client(Settings(is_persistent=False))
kb_collection = chroma_client.create_collection(name="incident_kb")

# Seed with some mock knowledge base data
kb_data = [
    {"id": "doc1", "text": "Runbook: High Memory Usage (Memory Leak). Step 1: Check heap size. Step 2: Restart payment_gateway. Step 3: Check for GC thrashing.", "meta": {"type": "runbook"}},
    {"id": "doc2", "text": "Past Incident INC-001: DDoS attack on auth_service. Resolution: Blocked IP range at API Gateway and scaled up replicas.", "meta": {"type": "incident"}},
    {"id": "doc3", "text": "Past Incident INC-002: DB Connection timeout. Resolution: Restarted DB connection pooler and killed idle transactions.", "meta": {"type": "incident"}},
]
kb_collection.add(
    documents=[d["text"] for d in kb_data],
    metadatas=[d["meta"] for d in kb_data],
    ids=[d["id"] for d in kb_data]
)

def query_kb(query_text: str, n_results: int = 1):
    results = kb_collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    if results['documents'] and results['documents'][0]:
        return results['documents'][0]
    return []
