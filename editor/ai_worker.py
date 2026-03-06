import os
from PyQt6.QtCore import QThread, pyqtSignal
from google import genai
from config import VINTAGE_PROMPT_PREFIX, VINTAGE_PROMPT_SUFFIX

class ImageGeneratorThread(QThread):
    finished = pyqtSignal(int, bytes)
    error = pyqtSignal(str)

    def __init__(self, db_id: int, prompt: str):
        super().__init__()
        self.db_id = db_id
        self.prompt = prompt

    def run(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.error.emit("Není nastaven GEMINI_API_KEY.\nVytvořte soubor .env vedle aplikace s obsahem:\nGEMINI_API_KEY=vas_klic")
            return
            
        try:
            client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
            full_prompt = f"{VINTAGE_PROMPT_PREFIX}{self.prompt}{VINTAGE_PROMPT_SUFFIX}"
            
            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[full_prompt],
            )
            
            image_bytes = None
            for part in response.parts:
                if part.inline_data is not None:
                    image_bytes = part.inline_data.data
                    break
                    
            if image_bytes:
                self.finished.emit(self.db_id, image_bytes)
            else:
                self.error.emit("AI odpověděla, ale nevrátila data obrázku.")
                
        except Exception as e:
            self.error.emit(f"Chyba při generování: {str(e)}")