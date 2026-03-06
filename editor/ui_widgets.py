from typing import Optional
from PyQt6.QtWidgets import QWidget, QApplication
from PyQt6.QtGui import QPainter, QColor, QFont, QPen, QImage, QPainterPath, QPixmap, QCursor
from PyQt6.QtCore import Qt, QRect, QRectF, QPoint, pyqtSignal
from models import CardData

class CardPreviewWidget(QWidget):
    # Signál, že se změnila pozice/velikost obrázku -> nutno uložit
    imageChanged = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(380, 620)
        self.card: Optional[CardData] = None
        self.pixmap: Optional[QPixmap] = None
        
        # Proměnné pro tahání myší
        self.last_mouse_pos = QPoint()
        self.is_dragging = False
        self.image_area_rect = QRect() # Oblast, kde se smí klikat

        # Povolit sledování myši pro změnu kurzoru
        self.setMouseTracking(True)

    def set_card(self, card: Optional[CardData]):
        self.card = card
        if card and card.image_data:
            img = QImage.fromData(card.image_data)
            self.pixmap = QPixmap.fromImage(img)
            
            # Pokud je scale 0 (nová karta) nebo default, nastavíme nějaký rozumný start
            # Ale raději necháme 1.0 nebo to, co je v DB.
            if self.card.img_scale <= 0.01:
                 self.card.img_scale = 1.0

        else:
            self.pixmap = None
        self.update()

    # --- Mouse Events pro manipulaci s obrázkem ---
    def mousePressEvent(self, event):
        if not self.card or not self.pixmap:
            return
        # Kontrola, zda klikáme do oblasti obrázku (horní část karty)
        if event.button() == Qt.MouseButton.LeftButton and self.image_area_rect.contains(event.pos()):
            self.is_dragging = True
            self.last_mouse_pos = event.pos()
            self.setCursor(QCursor(Qt.CursorShape.ClosedHandCursor))

    def mouseMoveEvent(self, event):
        # Indikace kurzoru
        if self.image_area_rect.contains(event.pos()):
            if not self.is_dragging:
                self.setCursor(QCursor(Qt.CursorShape.OpenHandCursor))
        else:
            if not self.is_dragging:
                self.setCursor(QCursor(Qt.CursorShape.ArrowCursor))

        # Logika posunu
        if self.is_dragging and self.card:
            delta = event.pos() - self.last_mouse_pos
            self.card.img_x += delta.x()
            self.card.img_y += delta.y()
            self.last_mouse_pos = event.pos()
            self.update()
            # Nevoláme save hned při každém pixelu, ale signál emitujeme, 
            # aby main window vědělo, že je "unsaved" stav, nebo pro autosave timer.
            # Pro jednoduchost zde: emitujeme až při release.

    def mouseReleaseEvent(self, event):
        if self.is_dragging:
            self.is_dragging = False
            self.setCursor(QCursor(Qt.CursorShape.OpenHandCursor))
            self.imageChanged.emit() # Tady uložíme do DB

    def wheelEvent(self, event):
        if not self.card or not self.pixmap:
            return
        
        # Zoomování pouze v oblasti obrázku
        if self.image_area_rect.contains(event.position().toPoint()):
            # Delta je obvykle 120 nebo -120
            delta = event.angleDelta().y()
            zoom_factor = 1.05 if delta > 0 else 0.95
            
            new_scale = self.card.img_scale * zoom_factor
            
            # Omezíme zoom (např. 0.1x až 5.0x)
            if 0.1 < new_scale < 5.0:
                self.card.img_scale = new_scale
                self.update()
                self.imageChanged.emit() # Uložit změnu

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Definice oblasti obrázku (cca horních 65% karty)
        self.image_area_rect = QRect(0, 0, self.width(), int(self.height() * 0.65))

        if not self.card:
            painter.fillRect(self.rect(), QColor("#1a1614"))
            painter.setPen(QColor("#dcd7c9"))
            painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, "Žádná karta není vybrána")
            return

        # 1. Podklad karty
        card_rect = self.rect()
        painter.fillRect(card_rect, QColor("#fdfbf7"))
        painter.setPen(QPen(QColor("#8b4513"), 2))
        painter.drawRect(card_rect.adjusted(6, 6, -6, -6))

        # 2. Vykreslení obrázku s transformací (Scale & Translate)
        # Oříznutí (Clip), aby obrázek nezasahoval do textu
        clip_path = QPainterPath()
        clip_path.addRect(QRectF(self.image_area_rect))
        painter.setClipPath(clip_path)

        if self.pixmap:
            # Rozměry obrázku po aplikaci měřítka
            scaled_w = self.pixmap.width() * self.card.img_scale
            scaled_h = self.pixmap.height() * self.card.img_scale

            # Výpočet pozice: Střed oblasti + Offset - Polovina obrázku
            # Tím zajistíme, že (0,0) offset je vycentrování
            center_x = self.image_area_rect.width() / 2
            center_y = self.image_area_rect.height() / 2
            
            draw_x = center_x + self.card.img_x - (scaled_w / 2)
            draw_y = center_y + self.card.img_y - (scaled_h / 2)

            painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
            painter.drawPixmap(
                int(draw_x), 
                int(draw_y), 
                int(scaled_w), 
                int(scaled_h), 
                self.pixmap
            )
        else:
            painter.fillRect(self.image_area_rect, QColor("#f4f1ea"))
            painter.setPen(QColor("#4a3f35"))
            painter.drawText(self.image_area_rect, Qt.AlignmentFlag.AlignCenter, "[Chromolithograph Placeholder]")

        # Zrušení clippingu pro zbytek UI
        painter.setClipping(False)

        # --- Zbytek vykreslování (Texty, Staty) ---
        # (Kód zkopírovaný z původního souboru, beze změn)
        
        # ID & Cost
        painter.setPen(QColor("#2c241e")); painter.setFont(QFont("Georgia", 20, QFont.Weight.Black))
        painter.drawText(QRect(20, 20, 50, 40), Qt.AlignmentFlag.AlignLeft, str(self.card.card_number))
        
        cost_circle = QRect(self.width() - 60, 20, 40, 40)
        painter.setBrush(QColor(253, 251, 247, 200)); painter.setPen(QPen(QColor("#8b4513"), 2)); painter.drawEllipse(cost_circle)
        painter.setPen(QColor("#8b4513")); painter.setFont(QFont("Georgia", 18, QFont.Weight.Bold))
        painter.drawText(cost_circle, Qt.AlignmentFlag.AlignCenter, str(self.card.cost))

        # Info Box
        info_rect = QRect(0, int(self.height() * 0.65), self.width(), int(self.height() * 0.35))
        painter.fillRect(info_rect, QColor("#f5e6d3"))
        painter.setPen(QPen(QColor(139, 69, 19, 50), 2)); painter.drawLine(info_rect.topLeft(), info_rect.topRight())

        # Texts
        painter.setPen(QColor(139, 69, 19, 150)); painter.setFont(QFont("Arial", 8, QFont.Weight.Black))
        painter.drawText(QRect(info_rect.x(), info_rect.y() + 15, info_rect.width(), 20), Qt.AlignmentFlag.AlignCenter, f"{self.card.faction.upper()} COLLECTION")

        painter.setPen(QColor("#1a1614")); painter.setFont(QFont("Georgia", 22, QFont.Weight.Black))
        painter.drawText(QRect(info_rect.x() + 20, info_rect.y() + 35, info_rect.width() - 40, 40), Qt.AlignmentFlag.AlignCenter, self.card.title.upper())

        # Description
        desc_rect = QRect(info_rect.x() + 30, info_rect.y() + 95, info_rect.width() - 60, 60)
        painter.setPen(QColor("#4a3f35")); painter.setFont(QFont("Georgia", 11, italic=True))
        painter.drawText(desc_rect, int(Qt.AlignmentFlag.AlignCenter) | int(Qt.TextFlag.TextWordWrap), f'"{self.card.description}"')

        # --- STATS ROW ---
        stats_rect = QRect(info_rect.x() + 20, info_rect.bottom() - 50, info_rect.width() - 40, 40)
        painter.setPen(QPen(QColor(139, 69, 19, 80), 2)); painter.drawLine(stats_rect.topLeft(), stats_rect.topRight())

        num_font = QFont("Georgia", 18, QFont.Weight.Black)
        icon_font = QFont("Georgia", 24)

        # Attack/Defense (Left) - Sheriff Star
        painter.setFont(icon_font); painter.setPen(QColor("#8b4513"))
        painter.drawText(QRect(stats_rect.x(), stats_rect.y(), 35, stats_rect.height()), int(Qt.AlignmentFlag.AlignLeft) | int(Qt.AlignmentFlag.AlignVCenter), "✯")
        painter.setFont(num_font); painter.setPen(QColor("#2c241e"))
        painter.drawText(QRect(stats_rect.x() + 35, stats_rect.y(), 40, stats_rect.height()), int(Qt.AlignmentFlag.AlignLeft) | int(Qt.AlignmentFlag.AlignVCenter), str(self.card.defense))

        # Health (Right) - Red Heart
        painter.setFont(num_font); painter.setPen(QColor("#2c241e"))
        painter.drawText(QRect(stats_rect.right() - 75, stats_rect.y(), 40, stats_rect.height()), int(Qt.AlignmentFlag.AlignRight) | int(Qt.AlignmentFlag.AlignVCenter), str(self.card.health))
        painter.setFont(icon_font); painter.setPen(QColor("#8a1c1c"))
        painter.drawText(QRect(stats_rect.right() - 30, stats_rect.y(), 30, stats_rect.height()), int(Qt.AlignmentFlag.AlignRight) | int(Qt.AlignmentFlag.AlignVCenter), "♥")

        # Type (Center)
        painter.setPen(QColor(139, 69, 19, 180)); painter.setFont(QFont("Courier", 11, QFont.Weight.Bold))
        painter.drawText(stats_rect, int(Qt.AlignmentFlag.AlignCenter) | int(Qt.AlignmentFlag.AlignVCenter), self.card.type.upper())