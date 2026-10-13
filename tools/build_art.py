"""Regenerate every expansion asset. Usage: python tools/build_art.py"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
import art_upgrades, art_north, art_map, art_bg, art_hud
art_upgrades.build_sheet()
art_north.map_icons(); art_north.castle_skin(); art_north.scenery(); art_north.units(); art_north.fx_sheet()
art_map.build(); art_map.write_js()
art_bg.build_all()
art_north.register_icons(); art_hud.build()
import art_ui; art_ui.build()
print('all art ok')
