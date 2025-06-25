# backend/config/settings.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database settings
    pg_db_host: str = "localhost"
    pg_db_port: str = "5432"
    pg_db_name: str
    pg_db_user: str = "postgres"
    pg_db_password: str
    
    # AI/ML settings
    openai_api_key: str
    pca_model_file: str = "backend/embedding/pca_model_copy.pkl"
    pca_components: int = 1000
    
    # Search algorithm weights
    keyword_weight: float = 0.8
    semantic_weight: float = 0.2
    
    # File storage settings
    resume_base_url: str = "https://uploads.careers.mcs.mn/r"
    profile_image_base_url: str = "https://uploads.careers.mcs.mn/u/b"
    default_profile_image: str = "/images/profile_example_pic.png"
    
    # Optional: Translation cache settings
    enable_translation_cache: bool = True
    translation_cache_expiry_hours: int = 24

    def __post_init__(self):
        print(f"Loaded PCA_MODEL_FILE: {self.pca_model_file}")
        print(f"Resume base URL: {self.resume_base_url}")
        
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"