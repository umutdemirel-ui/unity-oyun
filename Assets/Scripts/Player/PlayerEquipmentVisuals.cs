using UnityEngine;

namespace Fellhaven.Player
{
    public sealed class PlayerEquipmentVisuals : MonoBehaviour
    {
        private PlayerInventory inventory;
        private Renderer weaponRenderer;
        private Renderer chestRenderer;
        private MaterialPropertyBlock propertyBlock;
        private static readonly int BaseColor = Shader.PropertyToID("_BaseColor");
        private static readonly int ColorProperty = Shader.PropertyToID("_Color");

        public void Configure(PlayerInventory playerInventory, Transform visualRoot)
        {
            if (inventory != null)
                inventory.Changed -= ApplyEquipment;

            inventory = playerInventory;
            propertyBlock = new MaterialPropertyBlock();
            if (visualRoot != null)
            {
                Transform blade = visualRoot.Find("Right Arm/Weapon Pivot/Sword Blade");
                Transform chest = visualRoot.Find("Chestplate");
                weaponRenderer = blade != null ? blade.GetComponent<Renderer>() : null;
                chestRenderer = chest != null ? chest.GetComponent<Renderer>() : null;
            }

            if (inventory != null)
                inventory.Changed += ApplyEquipment;
            ApplyEquipment();
        }

        private void ApplyEquipment()
        {
            if (inventory == null)
                return;

            string weapon = inventory.GetEquippedItem(EquipmentSlot.Weapon);
            string chest = inventory.GetEquippedItem(EquipmentSlot.Chest);
            ApplyColor(weaponRenderer, weapon == "marauder_cleaver"
                ? new Color(0.72f, 0.38f, 0.24f)
                : new Color(0.72f, 0.76f, 0.74f));
            ApplyColor(chestRenderer, chest == "marauder_vest"
                ? new Color(0.47f, 0.24f, 0.18f)
                : new Color(0.55f, 0.48f, 0.34f));
        }

        private void ApplyColor(Renderer target, Color color)
        {
            if (target == null)
                return;

            target.GetPropertyBlock(propertyBlock);
            if (target.sharedMaterial != null && target.sharedMaterial.HasProperty(BaseColor))
                propertyBlock.SetColor(BaseColor, color);
            else
                propertyBlock.SetColor(ColorProperty, color);
            target.SetPropertyBlock(propertyBlock);
        }

        private void OnDestroy()
        {
            if (inventory != null)
                inventory.Changed -= ApplyEquipment;
        }
    }
}
