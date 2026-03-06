import re
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QGroupBox, QCheckBox, QComboBox, 
    QLabel, QStackedWidget, QWidget, QSpinBox, QLineEdit, QDialogButtonBox,
    QTextEdit, QProgressBar, QMessageBox,QPushButton
)
from PyQt6.QtCore import Qt
from models import CardData

class LuaImportDialog(QDialog):
    def __init__(self, deck_id: int, db_manager, parent=None):
        super().__init__(parent)
        self.deck_id = deck_id
        self.db_manager = db_manager
        self.imported_count = 0
        
        self.setWindowTitle("📜 Import Lua Data")
        self.resize(700, 600)
        self.setStyleSheet("""
            QDialog { background-color: #1a1614; color: #dcd7c9; }
            QTextEdit { background-color: #0f0d0c; color: #55ff55; font-family: Consolas; border: 1px solid #3a2f26; }
            QLabel { color: #dcd7c9; font-weight: bold; }
            QPushButton { background-color: #8b4513; color: white; border: 1px solid #3a2f26; padding: 8px; font-weight: bold; }
            QPushButton:hover { background-color: #a0522d; }
            QProgressBar { border: 1px solid #3a2f26; text-align: center; color: white; }
            QProgressBar::chunk { background-color: #8b4513; }
        """)

        layout = QVBoxLayout(self)

        layout.addWidget(QLabel("Vložte Lua kód (Config.Cards = { ... }):"))

        self.text_input = QTextEdit()
        self.text_input.setPlaceholderText('Example: [1] = { id = 1, faction = "Law", name = "SHERIFF", ... }')
        layout.addWidget(self.text_input)

        self.progress = QProgressBar()
        self.progress.setValue(0)
        layout.addWidget(self.progress)

        btns = QHBoxLayout()
        btn_cancel = QPushButton("Zrušit")
        btn_cancel.clicked.connect(self.reject)
        
        self.btn_import = QPushButton("📥 Importovat Karty")
        self.btn_import.clicked.connect(self.run_import)
        
        btns.addWidget(btn_cancel)
        btns.addWidget(self.btn_import)
        layout.addLayout(btns)

    def run_import(self):
        text = self.text_input.toPlainText()
        if not text.strip():
            return

        # Rozdělíme text na řádky a budeme hledat vzory
        lines = text.split('\n')
        parsed_cards = []

        # Regexy pro jednotlivé fieldy
        # Hledáme vzor: key = value (číslo nebo "string")
        re_id = re.compile(r'id\s*=\s*(\d+)')
        re_faction = re.compile(r'faction\s*=\s*"([^"]+)"')
        re_name = re.compile(r'name\s*=\s*"([^"]+)"')
        re_type = re.compile(r'type\s*=\s*"([^"]+)"')
        re_cost = re.compile(r'cost\s*=\s*(\d+)')
        re_atk = re.compile(r'atk\s*=\s*(\d+)')
        re_hp = re.compile(r'hp\s*=\s*(\d+)')
        re_text = re.compile(r'text\s*=\s*"([^"]*)"') # Hvězdička u textu, může být prázdný

        for line in lines:
            line = line.strip()
            # Zpracujeme jen řádky, které obsahují definici karty
            if not line.startswith('[') and 'id =' not in line:
                continue

            try:
                # Extrakce dat
                c_id = re_id.search(line)
                c_faction = re_faction.search(line)
                c_name = re_name.search(line)
                c_type = re_type.search(line)
                c_cost = re_cost.search(line)
                c_atk = re_atk.search(line)
                c_hp = re_hp.search(line)
                c_text = re_text.search(line)

                # Pokud chybí jméno nebo ID, přeskočíme
                if not c_id or not c_name:
                    continue

                # Mapping hodnot
                val_number = c_id.group(1)
                val_faction = c_faction.group(1) if c_faction else "Neutral"
                val_title = c_name.group(1)
                val_type = c_type.group(1) if c_type else "Unit"
                val_cost = int(c_cost.group(1)) if c_cost else 0
                val_atk = int(c_atk.group(1)) if c_atk else 0
                val_hp = int(c_hp.group(1)) if c_hp else 0
                val_desc = c_text.group(1) if c_text else ""

                # Vytvoření promptu pro AI
                prompt = f"Wild West illustration of {val_title}, {val_faction} faction, {val_type}, {val_desc}"

                # Vytvoření objektu karty
                # atk mapujeme na 'defense' (který v UI slouží jako levý stat)
                new_card = CardData(
                    db_id=None,
                    deck_id=self.deck_id,
                    card_number=val_number,
                    faction=val_faction,
                    title=val_title,
                    type=val_type,
                    cost=val_cost,
                    defense=val_atk,  # Mapping ATK -> Defense slot (levý stat)
                    health=val_hp,
                    description=val_desc,
                    image_prompt=prompt,
                    image_data=None
                )
                parsed_cards.append(new_card)

            except Exception as e:
                print(f"Skipping line due to error: {line} -> {e}")

        # Uložení do DB
        if not parsed_cards:
            QMessageBox.warning(self, "Chyba", "Nepodařilo se nalézt žádná data karet.")
            return

        self.progress.setMaximum(len(parsed_cards))
        
        for i, card in enumerate(parsed_cards):
            self.db_manager.save_card(card)
            self.progress.setValue(i + 1)
        
        self.imported_count = len(parsed_cards)
        QMessageBox.information(self, "Hotovo", f"Úspěšně importováno {self.imported_count} karet.")
        self.accept()

class EffectConstructorDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("⚙️ Konstruktor herních mechanismů")
        self.resize(600, 550)
        self.setStyleSheet("""
            QDialog { background-color: #1a1614; color: #dcd7c9; }
            QGroupBox { border: 1px solid #3a2f26; margin-top: 10px; font-weight: bold; color: #8b4513; }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 3px 0 3px; }
            QLabel, QCheckBox, QRadioButton { color: #dcd7c9; }
            QComboBox, QSpinBox, QLineEdit { background-color: #0f0d0c; color: white; border: 1px solid #3a2f26; padding: 4px; }
            QPushButton { background-color: #2c241e; color: white; border: 1px solid #3a2f26; padding: 8px; }
            QPushButton:hover { background-color: #3a2f26; }
        """)

        layout = QVBoxLayout(self)

        # 1. Keywords
        kw_group = QGroupBox("1. Klíčová slova (Keywords)")
        kw_layout = QHBoxLayout(kw_group)
        self.cb_guardian = QCheckBox("Guardian")
        self.cb_ambush = QCheckBox("Ambush")
        self.cb_stealth = QCheckBox("Stealth")
        self.cb_lethal = QCheckBox("Lethal")
        for cb in [self.cb_guardian, self.cb_ambush, self.cb_stealth, self.cb_lethal]:
            kw_layout.addWidget(cb)
            cb.stateChanged.connect(self.update_preview)
        layout.addWidget(kw_group)

        # 2. Trigger
        trig_group = QGroupBox("2. Spouštěč (Trigger)")
        trig_layout = QVBoxLayout(trig_group)
        self.combo_trigger = QComboBox()
        self.combo_trigger.addItems([
            "--- Žádný (Pasivní / Gear / Kouzlo) ---", "Battlecry:", "Last word:", "End of turn:", "Start of your turn:"
        ])
        self.combo_trigger.currentIndexChanged.connect(self.update_preview)
        trig_layout.addWidget(self.combo_trigger)
        layout.addWidget(trig_group)

        # 3. Action
        act_group = QGroupBox("3. Efekt (Action)")
        act_layout = QVBoxLayout(act_group)
        
        self.combo_action = QComboBox()
        self.combo_action.addItem("Žádná akce", "none")
        self.combo_action.addItem("Zranit (Deal damage)", "dmg")
        self.combo_action.addItem("Léčit (Restore/Heal)", "heal")
        self.combo_action.addItem("Líznout karty (Draw)", "draw")
        self.combo_action.addItem("Získat Grit (Gain Grit)", "grit")
        self.combo_action.addItem("Zahodit karty (Discard)", "discard")
        self.combo_action.addItem("Zničit všechny (Destroy All)", "wipe")
        self.combo_action.addItem("Buff statů (pro Gear)", "buff")
        
        act_layout.addWidget(QLabel("Typ efektu:"))
        act_layout.addWidget(self.combo_action)

        self.stacked = QStackedWidget()
        act_layout.addWidget(self.stacked)

        self.page_none = QWidget(); self.stacked.addWidget(self.page_none)

        self.page_dmg = QWidget()
        l_dmg = QHBoxLayout(self.page_dmg)
        self.spin_dmg = QSpinBox(); self.spin_dmg.setRange(1, 99)
        self.combo_dmg_target = QComboBox()
        self.combo_dmg_target.addItem("(bez cíle)", "")
        self.combo_dmg_target.addItem("do všech (to all characters)", "to all characters")
        self.combo_dmg_target.addItem("do všech nepřátel (to all enemy units)", "to all enemy units")
        self.combo_dmg_target.addItem("do tvého hrdiny (to your hero)", "to your hero")
        self.combo_dmg_target.addItem("náhodný nepřítel (random enemy)", "random enemy")
        l_dmg.addWidget(QLabel("Počet:")); l_dmg.addWidget(self.spin_dmg)
        l_dmg.addWidget(QLabel("Cíl:")); l_dmg.addWidget(self.combo_dmg_target)
        self.stacked.addWidget(self.page_dmg)

        self.page_heal = QWidget()
        l_heal = QHBoxLayout(self.page_heal)
        self.spin_heal = QSpinBox(); self.spin_heal.setRange(1, 99)
        self.combo_heal_type = QComboBox()
        self.combo_heal_type.addItem("běžné léčení", "restore")
        self.combo_heal_type.addItem("plné vyléčení", "fully")
        self.combo_heal_target = QComboBox()
        self.combo_heal_target.addItem("(target)", "")
        self.combo_heal_target.addItem("to your hero", "to your hero")
        l_heal.addWidget(self.combo_heal_type); l_heal.addWidget(self.spin_heal); l_heal.addWidget(self.combo_heal_target)
        self.stacked.addWidget(self.page_heal)

        self.page_num = QWidget()
        l_num = QHBoxLayout(self.page_num)
        self.spin_num = QSpinBox(); self.spin_num.setRange(1, 10)
        l_num.addWidget(QLabel("Množství:")); l_num.addWidget(self.spin_num); l_num.addStretch()
        self.stacked.addWidget(self.page_num)

        self.page_disc = QWidget()
        l_disc = QHBoxLayout(self.page_disc)
        self.combo_disc = QComboBox(); self.combo_disc.addItem("Zahodit ruku", "hand"); self.combo_disc.addItem("Zahodit X karet", "num")
        self.spin_disc = QSpinBox(); self.spin_disc.setRange(1, 10)
        l_disc.addWidget(self.combo_disc); l_disc.addWidget(self.spin_disc)
        self.stacked.addWidget(self.page_disc)

        self.page_wipe = QWidget()
        l_wipe = QVBoxLayout(self.page_wipe); l_wipe.addWidget(QLabel("Efekt: Destroy ALL Units"))
        self.stacked.addWidget(self.page_wipe)

        self.page_buff = QWidget()
        l_buff = QHBoxLayout(self.page_buff)
        self.spin_buff_atk = QSpinBox(); self.spin_buff_atk.setRange(-10, 10)
        self.spin_buff_hp = QSpinBox(); self.spin_buff_hp.setRange(0, 10)
        l_buff.addWidget(QLabel("+ Atk:")); l_buff.addWidget(self.spin_buff_atk)
        l_buff.addWidget(QLabel("+ HP:")); l_buff.addWidget(self.spin_buff_hp)
        self.stacked.addWidget(self.page_buff)

        layout.addWidget(act_group)

        # 4. Preview
        prev_group = QGroupBox("Výsledný text pro parser")
        prev_lay = QVBoxLayout(prev_group)
        self.res_line = QLineEdit()
        self.res_line.setReadOnly(True)
        self.res_line.setStyleSheet("font-family: Consolas; font-size: 14px; color: #55ff55; background: #000;")
        prev_lay.addWidget(self.res_line)
        layout.addWidget(prev_group)

        # Buttons
        btns = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        btns.button(QDialogButtonBox.StandardButton.Ok).setText("Vložit do karty")
        layout.addWidget(btns)

        # Signals
        self.combo_action.currentIndexChanged.connect(self.on_action_change)
        
        widgets = [self.spin_dmg, self.combo_dmg_target, self.spin_heal, self.combo_heal_type,
                   self.combo_heal_target, self.spin_num, self.combo_disc, self.spin_disc,
                   self.spin_buff_atk, self.spin_buff_hp]
        for w in widgets:
            if isinstance(w, QSpinBox): w.valueChanged.connect(self.update_preview)
            if isinstance(w, QComboBox): w.currentIndexChanged.connect(self.update_preview)

        self.on_action_change()

    def on_action_change(self):
        data = self.combo_action.currentData()
        if data == "none": self.stacked.setCurrentWidget(self.page_none)
        elif data == "dmg": self.stacked.setCurrentWidget(self.page_dmg)
        elif data == "heal": self.stacked.setCurrentWidget(self.page_heal)
        elif data in ["draw", "grit"]: self.stacked.setCurrentWidget(self.page_num)
        elif data == "discard": self.stacked.setCurrentWidget(self.page_disc)
        elif data == "wipe": self.stacked.setCurrentWidget(self.page_wipe)
        elif data == "buff": self.stacked.setCurrentWidget(self.page_buff)
        self.update_preview()

    def update_preview(self):
        parts = []
        kws = []
        if self.cb_guardian.isChecked(): kws.append("Guardian")
        if self.cb_ambush.isChecked(): kws.append("Ambush")
        if self.cb_stealth.isChecked(): kws.append("Stealth")
        if self.cb_lethal.isChecked(): kws.append("Lethal")
        if kws: parts.append(", ".join(kws) + ".")

        if self.combo_trigger.currentIndex() > 0:
            parts.append(self.combo_trigger.currentText())

        act = self.combo_action.currentData()
        atxt = ""
        if act == "dmg":
            tgt = self.combo_dmg_target.currentData()
            atxt = f"deal {self.spin_dmg.value()} damage" + (f" {tgt}" if tgt else "")
        elif act == "heal":
            htype = self.combo_heal_type.currentData()
            tgt = self.combo_heal_target.currentData()
            atxt = "fully heal" if htype == "fully" else f"restore {self.spin_heal.value()} health"
            if tgt: atxt += f" {tgt}"
        elif act == "draw": atxt = f"draw {self.spin_num.value()}"
        elif act == "grit": atxt = f"gain {self.spin_num.value()} grit"
        elif act == "discard": atxt = "discard your hand" if self.combo_disc.currentData() == "hand" else f"discard {self.spin_disc.value()} cards"
        elif act == "wipe": atxt = "destroy all units"
        elif act == "buff":
            atk, hp = self.spin_buff_atk.value(), self.spin_buff_hp.value()
            atxt = f"+{atk}/+{hp}" if atk >= 0 else f"{atk}/+{hp}"

        if atxt: parts.append(atxt)
        
        final = " ".join(parts)
        if final: final = final[0].upper() + final[1:]
        self.res_line.setText(final)

    def get_result(self):
        return self.res_line.text()