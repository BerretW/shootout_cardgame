import sys
import os

# Pokus o import dotenv
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

def get_app_path():
    """
    Vrátí cestu ke složce, kde běží aplikace.
    Funguje správně jak pro Python skript, tak pro zkompilovaný .exe soubor.
    """
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    else:
        return os.path.dirname(os.path.abspath(__file__))

# Inicializace prostředí
APP_PATH = get_app_path()
if HAS_DOTENV:
    load_dotenv(os.path.join(APP_PATH, ".env"))

# Konstanty pro AI
VINTAGE_PROMPT_PREFIX = "A detailed 19th-century chromolithograph illustration of "
VINTAGE_PROMPT_SUFFIX = ", vintage cigarette card style, highly detailed, muted antique colors, isolated subject, NO TEXT, NO BORDERS, NO WRITING, plain aged paper background, masterpiece quality, authentic 1890s aesthetic."