#!/bin/sh
# Run after `npx cap add ios`: landscape only, hidden status bar, app icon and splash from ios-assets/.
set -e
cd "$(dirname "$0")/.."
PLIST=ios/App/App/Info.plist
PB=/usr/libexec/PlistBuddy
set_key() { $PB -c "Set :$1 $2" "$PLIST" 2>/dev/null || $PB -c "Add :$1 $3 $2" "$PLIST"; }
for k in UISupportedInterfaceOrientations "UISupportedInterfaceOrientations~ipad"; do
  $PB -c "Delete :$k" "$PLIST" 2>/dev/null || true
  $PB -c "Add :$k array" "$PLIST"
  $PB -c "Add :$k:0 string UIInterfaceOrientationLandscapeLeft" "$PLIST"
  $PB -c "Add :$k:1 string UIInterfaceOrientationLandscapeRight" "$PLIST"
done
set_key UIStatusBarHidden true bool
set_key UIViewControllerBasedStatusBarAppearance false bool
set_key UIRequiresFullScreen true bool
set_key CFBundleDisplayName "Castle Conflict" string
set_key CFBundleShortVersionString "3.3" string
set_key ITSAppUsesNonExemptEncryption false bool
# App icon (single 1024 px icon, Xcode 14+ style) and splash
ICON=ios/App/App/Assets.xcassets/AppIcon.appiconset
cp ios-assets/AppIcon-1024.png "$ICON/AppIcon-512@2x.png"
SPL=ios/App/App/Assets.xcassets/Splash.imageset
for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do cp ios-assets/splash-2732x2732.png "$SPL/$f"; done
echo "ios patch ok"
