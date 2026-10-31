using Fellhaven.Core;
using Fellhaven.Enemies;
using Fellhaven.Player;
using Fellhaven.World;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Fellhaven.UI
{
    public sealed class PrototypeHUD : MonoBehaviour
    {
        private PrototypeGameManager gameManager;
        private DayNightCycle timeOfDay;
        private GUIStyle heading;
        private GUIStyle body;
        private GUIStyle small;
        private GUIStyle timeLabel;
        private GUIStyle buttonText;
        private Texture2D whiteTexture;
        private Vector2 inventoryScroll;

        public void Configure(PrototypeGameManager manager, DayNightCycle dayNightCycle)
        {
            gameManager = manager;
            timeOfDay = dayNightCycle;
        }

        private void Update()
        {
            if (gameManager == null || gameManager.Player == null || gameManager.Inventory == null)
                return;

            Mouse mouse = Mouse.current;
            if (mouse == null)
                return;

            bool leftClick = mouse.leftButton.wasPressedThisFrame;
            bool anyClick = leftClick || mouse.rightButton.wasPressedThisFrame || mouse.middleButton.wasPressedThisFrame;
            if (!anyClick)
                return;

            PrototypeInput input = gameManager.Player.GetComponent<PrototypeInput>();
            if (input == null)
                return;

            Vector2 mousePosition = mouse.position.ReadValue();
            Vector2 guiPosition = new Vector2(mousePosition.x, Screen.height - mousePosition.y);
            float scale = Mathf.Clamp(Screen.height / 900f, 0.78f, 1.25f);

            if (!input.InventoryOpen)
            {
                Rect inventoryButton = new Rect(18f * scale, Screen.height - 44f * scale, 152f * scale, 32f * scale);
                if (leftClick && inventoryButton.Contains(guiPosition))
                    input.ToggleInventory();
                else
                {
                    Cursor.lockState = CursorLockMode.Locked;
                    Cursor.visible = false;
                }
                return;
            }

            if (!leftClick)
                return;

            float width = Mathf.Min(560f * scale, Screen.width - 28f * scale);
            float height = Mathf.Min(460f * scale, Screen.height - 28f * scale);
            float x = (Screen.width - width) * 0.5f;
            float y = (Screen.height - height) * 0.5f;
            Rect closeButton = new Rect(x + width - 78f * scale, y + 12f * scale, 62f * scale, 26f * scale);
            if (closeButton.Contains(guiPosition))
            {
                input.CloseInventory();
                return;
            }

            float rowHeight = 50f * scale;
            Rect viewport = new Rect(x + 14f * scale, y + 72f * scale,
                width - 28f * scale, height - 94f * scale);
            float buttonWidth = 84f * scale;
            float contentWidth = viewport.width - 18f * scale;
            for (int i = 0; i < gameManager.Inventory.Stacks.Count; i++)
            {
                ItemStack stack = gameManager.Inventory.Stacks[i];
                if (stack == null || !RpgItemCatalog.TryGet(stack.ItemId, out RpgItemDefinition item))
                    continue;

                bool canEquip = item.Slot != EquipmentSlot.None;
                if (!canEquip && item.Type != RpgItemType.Consumable)
                    continue;

                Rect actionButton = new Rect(
                    viewport.x + contentWidth - buttonWidth - 5f * scale,
                    viewport.y + i * rowHeight - inventoryScroll.y + 7f * scale,
                    buttonWidth,
                    30f * scale);
                if (!actionButton.Contains(guiPosition))
                    continue;

                if (canEquip)
                    gameManager.Inventory.TryEquip(item.Id);
                else
                    gameManager.Inventory.TryUse(item.Id, gameManager.Player);
                return;
            }
        }

        private void OnGUI()
        {
            if (gameManager == null || gameManager.Player == null)
                return;

            EnsureStyles();
            float scale = Mathf.Clamp(Screen.height / 900f, 0.78f, 1.25f);
            float margin = 24f * scale;
            float panelWidth = 300f * scale;
            float panelHeight = 164f * scale;

            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.83f);
            GUI.DrawTexture(new Rect(margin, margin, panelWidth, panelHeight), whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(margin + 16f * scale, margin + 12f * scale, panelWidth - 32f * scale, 27f * scale),
                "FELLHAVEN  /  FIRST LIGHT", heading);

            DrawBar(new Rect(margin + 16f * scale, margin + 52f * scale, panelWidth - 32f * scale, 18f * scale),
                gameManager.Player.Health / gameManager.Player.MaxHealth,
                new Color(0.72f, 0.22f, 0.19f), $"VITALITY   {Mathf.CeilToInt(gameManager.Player.Health)}");
            DrawBar(new Rect(margin + 16f * scale, margin + 82f * scale, panelWidth - 32f * scale, 18f * scale),
                gameManager.Player.Stamina / gameManager.Player.MaxStamina,
                new Color(0.73f, 0.63f, 0.31f), $"STAMINA   {Mathf.CeilToInt(gameManager.Player.Stamina)}");

            PlayerProgression progression = gameManager.Progression;
            if (progression != null)
            {
                DrawBar(new Rect(margin + 16f * scale, margin + 110f * scale, panelWidth - 32f * scale, 14f * scale),
                    progression.Level >= PlayerProgression.MaximumLevel
                        ? 1f
                        : (float)progression.Experience / progression.ExperienceToNext,
                    new Color(0.35f, 0.57f, 0.67f),
                    progression.Level >= PlayerProgression.MaximumLevel
                        ? $"LEVEL {progression.Level}   MAX"
                        : $"LEVEL {progression.Level}   XP {progression.Experience}/{progression.ExperienceToNext}");
            }

            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(new Rect(margin + 16f * scale, margin + 132f * scale, panelWidth - 28f * scale, 22f * scale),
                gameManager.Objective, small);
            GUI.color = Color.white;

            DrawControls(scale, margin);
            DrawTimeOfDay(scale, margin);
            DrawInventoryButton(scale);
            DrawTarget(scale);
            DrawNearbyPickup(scale);
            DrawInventory(scale);
            DrawDeathPrompt(scale);
            if (!gameManager.Player.GetComponent<PrototypeInput>().InventoryOpen)
                DrawReticle(scale);
        }

        private void DrawControls(float scale, float margin)
        {
            float width = 292f * scale;
            float height = 132f * scale;
            float x = Screen.width - width - margin;
            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.70f);
            GUI.DrawTexture(new Rect(x, margin, width, height), whiteTexture);
            GUI.color = new Color(0.83f, 0.86f, 0.82f);
            GUI.Label(new Rect(x + 14f * scale, margin + 10f * scale, width - 28f * scale, height - 18f * scale),
                "WASD Move  Mouse Look (click world)\nShift   Sprint       Space   Jump\nCtrl   Dodge         LMB   Light\nRMB   Heavy          Alt   Block\nQ   Target            I / Tab   Pack\nE   Collect          H   Potion\nF5   Save             Esc   Cursor", small);
            GUI.color = Color.white;
        }

        private void DrawTimeOfDay(float scale, float margin)
        {
            if (timeOfDay == null)
                return;

            float width = 168f * scale;
            float height = 32f * scale;
            Rect clock = new Rect((Screen.width - width) * 0.5f, margin, width, height);
            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.78f);
            GUI.DrawTexture(clock, whiteTexture);
            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(new Rect(clock.x + 4f * scale, clock.y, clock.width - 8f * scale, clock.height),
                $"{timeOfDay.ClockLabel}  |  {timeOfDay.PhaseLabel}", timeLabel);
            GUI.color = Color.white;
        }

        private void DrawNearbyPickup(float scale)
        {
            if (gameManager.Inventory == null)
                return;

            PrototypeInput input = gameManager.Player.GetComponent<PrototypeInput>();
            if (input != null && input.InventoryOpen)
                return;

            WorldPickup pickup = WorldPickup.FindNearest(gameManager.Player.transform.position, 2.8f);
            if (pickup == null)
                return;

            float width = 320f * scale;
            float x = (Screen.width - width) * 0.5f;
            float y = Screen.height - 42f * scale;
            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.82f);
            GUI.DrawTexture(new Rect(x, y, width, 28f * scale), whiteTexture);
            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(new Rect(x + 10f * scale, y + 2f * scale, width - 20f * scale, 24f * scale),
                $"E  Collect {pickup.DisplayName}", body);
            GUI.color = Color.white;
        }

        private void DrawInventoryButton(float scale)
        {
            PrototypeInput input = gameManager.Player.GetComponent<PrototypeInput>();
            if (input == null || input.InventoryOpen)
                return;

            float width = 152f * scale;
            float height = 32f * scale;
            Rect button = new Rect(18f * scale, Screen.height - height - 12f * scale, width, height);
            DrawButton(button, "PACK  (I / TAB)");
        }

        private void DrawInventory(float scale)
        {
            PrototypeInput input = gameManager.Player.GetComponent<PrototypeInput>();
            if (input == null || !input.InventoryOpen || gameManager.Inventory == null)
                return;

            float width = Mathf.Min(560f * scale, Screen.width - 28f * scale);
            float height = Mathf.Min(460f * scale, Screen.height - 28f * scale);
            float x = (Screen.width - width) * 0.5f;
            float y = (Screen.height - height) * 0.5f;
            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.94f);
            GUI.DrawTexture(new Rect(x, y, width, height), whiteTexture);
            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(new Rect(x + 20f * scale, y + 12f * scale, width - 40f * scale, 28f * scale),
                "PACK & EQUIPMENT  ·  TAB TO CLOSE", heading);
            DrawButton(new Rect(x + width - 78f * scale, y + 12f * scale, 62f * scale, 26f * scale), "CLOSE");
            GUI.Label(new Rect(x + 20f * scale, y + 43f * scale, width - 40f * scale, 24f * scale),
                $"Level {gameManager.Progression.Level}     Gold {gameManager.Inventory.Gold}     " +
                $"Attack +{gameManager.Inventory.WeaponAttackBonus:0}     Armor {gameManager.Inventory.DefenseBonus:0}     " +
                $"Pack {gameManager.Inventory.UsedSlots}/{PlayerInventory.SlotCapacity}", small);

            float rowHeight = 50f * scale;
            Rect viewport = new Rect(x + 14f * scale, y + 72f * scale,
                width - 28f * scale, height - 94f * scale);
            float contentHeight = Mathf.Max(viewport.height, gameManager.Inventory.Stacks.Count * rowHeight);
            Rect content = new Rect(0f, 0f, viewport.width - 18f * scale, contentHeight);
            inventoryScroll = GUI.BeginScrollView(viewport, inventoryScroll, content);

            if (gameManager.Inventory.Stacks.Count == 0)
            {
                GUI.color = Color.white;
                GUI.Label(new Rect(8f * scale, 8f * scale, content.width - 16f * scale, 32f * scale),
                    "Your pack is empty. Search the trail for supplies.", small);
            }

            for (int i = 0; i < gameManager.Inventory.Stacks.Count; i++)
            {
                ItemStack stack = gameManager.Inventory.Stacks[i];
                if (!RpgItemCatalog.TryGet(stack.ItemId, out RpgItemDefinition item))
                    continue;

                Rect row = new Rect(0f, i * rowHeight, content.width, rowHeight - 4f * scale);
                GUI.color = new Color(0.14f, 0.16f, 0.15f, 0.96f);
                GUI.DrawTexture(row, whiteTexture);
                GUI.color = new Color(0.94f, 0.91f, 0.82f);
                float buttonWidth = 84f * scale;
                float textWidth = row.width - buttonWidth - 22f * scale;
                string equippedLabel = gameManager.Inventory.IsEquipped(item.Id) ? "  ·  Equipped" : string.Empty;
                GUI.Label(new Rect(row.x + 9f * scale, row.y + 5f * scale, textWidth, row.height - 8f * scale),
                    $"{item.DisplayName}  x{stack.Quantity}  ·  {item.Rarity}{equippedLabel}\n{item.Description}", small);

                if (item.Slot != EquipmentSlot.None)
                {
                    DrawButton(new Rect(row.x + row.width - buttonWidth - 5f * scale, row.y + 7f * scale,
                        buttonWidth, 30f * scale), gameManager.Inventory.IsEquipped(item.Id) ? "Ready" : "Equip");
                }
                else if (item.Type == RpgItemType.Consumable)
                {
                    DrawButton(new Rect(row.x + row.width - buttonWidth - 5f * scale, row.y + 7f * scale,
                        buttonWidth, 30f * scale), "Use");
                }
                GUI.color = Color.white;
            }

            GUI.EndScrollView();
            GUI.color = Color.white;
        }

        private void DrawButton(Rect rect, string label)
        {
            GUI.color = new Color(0.16f, 0.18f, 0.17f, 1f);
            GUI.DrawTexture(rect, whiteTexture);
            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(rect, label, buttonText);
            GUI.color = Color.white;
        }

        private void DrawTarget(float scale)
        {
            PlayerCombat combat = gameManager.Player.GetComponent<PlayerCombat>();
            if (combat == null || combat.LockedTarget == null || !combat.LockedTarget.IsAlive)
                return;

            EnemyBrain target = combat.LockedTarget;
            float width = 360f * scale;
            float height = 66f * scale;
            float x = (Screen.width - width) * 0.5f;
            float y = 28f * scale;

            GUI.color = new Color(0.025f, 0.035f, 0.035f, 0.82f);
            GUI.DrawTexture(new Rect(x, y, width, height), whiteTexture);
            GUI.color = new Color(0.96f, 0.91f, 0.76f);
            GUI.Label(new Rect(x + 14f * scale, y + 7f * scale, width - 28f * scale, 23f * scale),
                $"{target.DisplayName}   ·   {target.StateLabel}", body);
            GUI.color = Color.white;
            DrawBar(new Rect(x + 14f * scale, y + 37f * scale, width - 28f * scale, 14f * scale),
                target.Health / target.MaxHealth, new Color(0.62f, 0.22f, 0.19f), string.Empty);
        }

        private void DrawDeathPrompt(float scale)
        {
            if (!gameManager.Player.IsDead)
                return;

            float width = 420f * scale;
            float height = 108f * scale;
            float x = (Screen.width - width) * 0.5f;
            float y = (Screen.height - height) * 0.5f;
            GUI.color = new Color(0.02f, 0.025f, 0.03f, 0.9f);
            GUI.DrawTexture(new Rect(x, y, width, height), whiteTexture);
            GUI.color = new Color(0.96f, 0.86f, 0.73f);
            GUI.Label(new Rect(x + 20f * scale, y + 17f * scale, width - 40f * scale, 35f * scale),
                "THE ROAD ENDS HERE", heading);
            GUI.Label(new Rect(x + 20f * scale, y + 59f * scale, width - 40f * scale, 28f * scale),
                "Press R to return to the wayfarer's shrine.", body);
            GUI.color = Color.white;
        }

        private void DrawReticle(float scale)
        {
            if (gameManager.Player.IsDead)
                return;

            float cx = Screen.width * 0.5f;
            float cy = Screen.height * 0.5f;
            GUI.color = new Color(0.95f, 0.9f, 0.7f, 0.72f);
            GUI.DrawTexture(new Rect(cx - 1.1f * scale, cy - 5f * scale, 2.2f * scale, 10f * scale), whiteTexture);
            GUI.DrawTexture(new Rect(cx - 5f * scale, cy - 1.1f * scale, 10f * scale, 2.2f * scale), whiteTexture);
            GUI.color = Color.white;
        }

        private void OnDestroy()
        {
            if (whiteTexture != null)
                Destroy(whiteTexture);
        }

        private void DrawBar(Rect rect, float fill, Color color, string label)
        {
            GUI.color = new Color(0.13f, 0.14f, 0.13f, 1f);
            GUI.DrawTexture(rect, whiteTexture);
            Rect fillRect = rect;
            fillRect.width *= Mathf.Clamp01(fill);
            GUI.color = color;
            GUI.DrawTexture(fillRect, whiteTexture);
            if (!string.IsNullOrEmpty(label))
            {
                GUI.color = Color.white;
                GUI.Label(new Rect(rect.x + 7f, rect.y - 1f, rect.width - 14f, rect.height + 4f), label, small);
            }
            GUI.color = Color.white;
        }

        private void EnsureStyles()
        {
            if (heading != null)
                return;

            heading = new GUIStyle(GUI.skin.label)
            {
                fontSize = 15,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft
            };
            body = new GUIStyle(GUI.skin.label)
            {
                fontSize = 13,
                alignment = TextAnchor.MiddleCenter,
                wordWrap = true
            };
            small = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                alignment = TextAnchor.MiddleLeft,
                wordWrap = true
            };
            timeLabel = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                wordWrap = false
            };
            buttonText = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter
            };
            whiteTexture = new Texture2D(1, 1, TextureFormat.RGBA32, false)
            {
                name = "HUD White Pixel"
            };
            whiteTexture.SetPixel(0, 0, Color.white);
            whiteTexture.Apply();
        }
    }
}
