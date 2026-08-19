from db import db
import json

async def find_similar_incident(description: str, service: str) -> dict:
    """Fuzzy match against past incidents. Returns best match or None."""
    query = description.lower()
    
    # Very simple fuzzy search
    incidents = db.get_all()
    best_match = None
    best_score = 0
    
    for inc in incidents:
        if inc.status != "resolved" and inc.status != "deployed":
            continue
            
        score = 0
        if service.lower() == inc.service.lower():
            score += 5
            
        # Common word overlap
        query_words = set(query.split())
        inc_words = set((inc.description or "").lower().split())
        overlap = len(query_words.intersection(inc_words))
        
        score += overlap
        
        if score > best_score and score >= 6: # Threshold
            best_score = score
            best_match = inc
            
    if best_match:
        return {
            "incident_id": best_match.incident_id,
            "description": best_match.description,
            "root_cause": best_match.root_cause,
            "code_patch": best_match.code_patch,
            "score": best_score
        }
    return None
