from dataclasses import dataclass
from typing import Optional

@dataclass
class CardData:
    db_id: Optional[int]
    deck_id: int
    card_number: str
    faction: str
    title: str
    type: str
    cost: int
    defense: int
    health: int
    description: str
    image_prompt: str
    image_data: Optional[bytes] = None
    # Nové položky pro úpravu obrázku
    img_scale: float = 1.0
    img_x: int = 0
    img_y: int = 0