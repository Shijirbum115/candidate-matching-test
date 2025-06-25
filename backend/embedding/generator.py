import requests
import joblib
import numpy as np
import os
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    def __init__(self, settings):
        self.api_key = settings.openai_api_key
        self.base_url = "https://api.openai.com/v1/embeddings"
        pca_model_path = settings.pca_model_file
        if not os.path.exists(pca_model_path):
            logger.error(f"PCA model file not found at: {pca_model_path}")
            raise FileNotFoundError(f"PCA model file not found at: {pca_model_path}")
        try:
            self.pca_model = joblib.load(pca_model_path)
            logger.info(f"Successfully loaded PCA model from: {pca_model_path}")
        except Exception as e:
            logger.error(f"Failed to load PCA model from {pca_model_path}: {str(e)}")
            raise
        self.pca_components = settings.pca_components
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        if not text or len(text.strip()) < 10:
            logger.warning(f"Text too short for embedding: {text[:50]}")
            return None
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            data = {"model": "text-embedding-3-large", "input": text}
            response = requests.post(self.base_url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Embedding generation error: {str(e)}")
            return None
    
    def reduce_embedding(self, embedding: List[float]) -> Optional[List[float]]:
        if not embedding or not self.pca_model:
            logger.error("No embedding or PCA model")
            return None
        try:
            reduced = self.pca_model.transform([embedding])[0]
            return reduced.tolist()
        except Exception as e:
            logger.error(f"PCA reduction error: {str(e)}")
            return None