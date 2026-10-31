# Fellhaven: First Light

Fellhaven is the first playable slice of a cross-platform fantasy action RPG. It is a Unity 6.3 LTS project that uses URP and Unity's Input System. The first encounter combines procedural gameplay geometry with a small set of license-checked environment assets, with no runtime network dependency.

## Open and play

1. Open this folder in Unity Hub with Unity **6000.3.9f1** or a compatible Unity 6.3 LTS editor.
2. Let Unity resolve the packages and compile the scripts. The editor setup creates the URP asset and `Assets/Scenes/Prototype.unity`, enables both Input System and legacy IMGUI events for keyboard/gamepad play and clickable HUD controls, sets mobile orientation to landscape, and adds the scene to the build settings.
3. Open the generated Prototype scene and press **Play**.

The development machine has Unity Editor **6000.3.9f1** and Android Build Support installed, including Android SDK/API levels 34–36, NDK r27c, OpenJDK 17, and CMake 3.22.1. The project has not yet been packaged as a Windows executable or Android APK.

## Prototype controls

- **WASD**: move
- **Mouse**: orbit camera
- **Shift**: sprint
- **Space**: jump
- **Left Ctrl**: dodge
- **Left mouse**: light attack
- **Right mouse**: heavy attack
- **Left Alt**: block
- **Q**: lock or release the marauder target
- **I / Tab**: open the pack and equipment screen
- **E**: collect a nearby item
- **H**: use a healing draught
- **F5**: save now
- **R**: restart the encounter after defeat
- **Escape**: release or recapture the mouse

Gamepad movement, look, attacks, dodge, jump, and blocking are also mapped through the Input System.

The game starts with the cursor available. Click the world to capture it for camera look; press **Escape** to release it. The Pack screen and its controls can be clicked whenever the cursor is released.

## Prototype scope

The opening slice includes a third-person player, orbit camera, a small forest trail and ruined campsite, one marauder with patrol/chase/attack/search/return behavior, health and stamina, experience and level progression, an inventory with consumables and materials, weapon/chest equipment with visible changes and stat effects, one world pickup, autosave/manual save, light and heavy melee attacks, blocking, dodging, jumping, target lock, defeat/restart flow, an on-screen HUD, and a running day/night cycle with a world clock and changing ambient light. Character meshes, weapons, camp props, and most vegetation remain temporary procedural assets.

## Included environment assets

- **ambientCG Ground 037**: 2K JPG color, DirectX normal, roughness, and ambient-occlusion maps. The color and normal maps texture the clearing floor. [Source and CC0 license](https://ambientcg.com/view?id=Ground037).
- **Poly Haven Rock 09**: 2K FBX and maps. Four close trail boulders use this shared model and material; the remaining boulders stay low-poly. [Source](https://polyhaven.com/a/rock_09) · [CC0 license](https://polyhaven.com/license).

The files are stored under `Assets/Resources/Fellhaven/FreeAssets/` and load locally at runtime. Import settings cap textures at 2K, enable mipmaps, and mark normal/roughness data as linear. See [asset license notes](Assets/Imported/FreeAssets/LICENSES.md).

The save file lives in Unity's per-user `Application.persistentDataPath` as `fellhaven-first-light-save.json`; inventory and progression changes save immediately, with a 60-second autosave and a save on pause/quit.

This is the foundation phase, not the completed open-world game. The remaining systems and asset needs are listed in [ROADMAP.md](ROADMAP.md).
"# unity-oyun" 
