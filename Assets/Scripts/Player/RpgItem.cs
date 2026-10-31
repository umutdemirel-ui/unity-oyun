using System;
using System.Collections.Generic;

namespace Fellhaven.Player
{
    public enum RpgItemType
    {
        Consumable,
        Weapon,
        Armor,
        Material,
        Quest
    }

    public enum EquipmentSlot
    {
        None,
        Weapon,
        Head,
        Chest,
        Hands,
        Feet,
        Accessory
    }

    public enum ItemRarity
    {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    public sealed class RpgItemDefinition
    {
        public string Id { get; }
        public string DisplayName { get; }
        public string Description { get; }
        public RpgItemType Type { get; }
        public EquipmentSlot Slot { get; }
        public ItemRarity Rarity { get; }
        public int MaxStack { get; }
        public int Value { get; }
        public float AttackBonus { get; }
        public float DefenseBonus { get; }
        public float HealAmount { get; }
        public float StaminaAmount { get; }

        public RpgItemDefinition(string id, string displayName, string description, RpgItemType type,
            EquipmentSlot slot, ItemRarity rarity, int maxStack, int value, float attackBonus = 0f,
            float defenseBonus = 0f, float healAmount = 0f, float staminaAmount = 0f)
        {
            Id = id;
            DisplayName = displayName;
            Description = description;
            Type = type;
            Slot = slot;
            Rarity = rarity;
            MaxStack = maxStack;
            Value = value;
            AttackBonus = attackBonus;
            DefenseBonus = defenseBonus;
            HealAmount = healAmount;
            StaminaAmount = staminaAmount;
        }
    }

    [Serializable]
    public sealed class ItemStack
    {
        public string ItemId;
        public int Quantity;

        public ItemStack() { }

        public ItemStack(string itemId, int quantity)
        {
            ItemId = itemId;
            Quantity = quantity;
        }
    }

    [Serializable]
    public sealed class EquippedItem
    {
        public EquipmentSlot Slot;
        public string ItemId;

        public EquippedItem() { }

        public EquippedItem(EquipmentSlot slot, string itemId)
        {
            Slot = slot;
            ItemId = itemId;
        }
    }

    public static class RpgItemCatalog
    {
        private static readonly Dictionary<string, RpgItemDefinition> Items = new Dictionary<string, RpgItemDefinition>
        {
            { "wayfarer_blade", new RpgItemDefinition("wayfarer_blade", "Wayfarer Blade", "A balanced sword for the road ahead.", RpgItemType.Weapon, EquipmentSlot.Weapon, ItemRarity.Common, 1, 18, attackBonus: 5f) },
            { "marauder_cleaver", new RpgItemDefinition("marauder_cleaver", "Marauder Cleaver", "A brutal blade with a heavy edge.", RpgItemType.Weapon, EquipmentSlot.Weapon, ItemRarity.Rare, 1, 48, attackBonus: 12f) },
            { "travelers_coat", new RpgItemDefinition("travelers_coat", "Traveler's Coat", "Worn leather, still better than bare cloth.", RpgItemType.Armor, EquipmentSlot.Chest, ItemRarity.Common, 1, 14, defenseBonus: 2f) },
            { "marauder_vest", new RpgItemDefinition("marauder_vest", "Marauder Vest", "Reinforced hide scavenged from the camp.", RpgItemType.Armor, EquipmentSlot.Chest, ItemRarity.Uncommon, 1, 32, defenseBonus: 4f) },
            { "healing_draught", new RpgItemDefinition("healing_draught", "Healing Draught", "Restores 45 vitality and 15 stamina.", RpgItemType.Consumable, EquipmentSlot.None, ItemRarity.Common, 5, 12, healAmount: 45f, staminaAmount: 15f) },
            { "alder_herb", new RpgItemDefinition("alder_herb", "Alder Herb", "A fragrant herb gathered along the trail.", RpgItemType.Material, EquipmentSlot.None, ItemRarity.Uncommon, 20, 4) },
            { "marauder_token", new RpgItemDefinition("marauder_token", "Marauder Token", "Proof that the old camp is safe again.", RpgItemType.Quest, EquipmentSlot.None, ItemRarity.Uncommon, 10, 0) },
            { "iron_ingot", new RpgItemDefinition("iron_ingot", "Iron Ingot", "A useful piece of smithing stock.", RpgItemType.Material, EquipmentSlot.None, ItemRarity.Common, 20, 6) }
        };

        public static IEnumerable<RpgItemDefinition> All => Items.Values;

        public static bool TryGet(string itemId, out RpgItemDefinition definition)
        {
            if (string.IsNullOrEmpty(itemId))
            {
                definition = null;
                return false;
            }
            return Items.TryGetValue(itemId, out definition);
        }
    }
}
