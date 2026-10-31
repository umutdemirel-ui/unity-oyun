using System;
using System.Collections.Generic;
using UnityEngine;

namespace Fellhaven.Player
{
    public sealed class PlayerInventory : MonoBehaviour
    {
        public const int SlotCapacity = 24;

        private readonly List<ItemStack> stacks = new List<ItemStack>();
        private readonly Dictionary<EquipmentSlot, string> equipped = new Dictionary<EquipmentSlot, string>();

        public event Action Changed;
        public IReadOnlyList<ItemStack> Stacks => stacks;
        public int UsedSlots => stacks.Count;
        public int Gold { get; private set; }
        public float WeaponAttackBonus => GetEquippedBonus(EquipmentSlot.Weapon, true);
        public float DefenseBonus => GetEquippedDefense();

        private void Awake()
        {
            AddItemInternal("wayfarer_blade", 1);
            AddItemInternal("travelers_coat", 1);
            AddItemInternal("healing_draught", 2);
            AddItemInternal("iron_ingot", 1);
            Gold = 25;
            equipped[EquipmentSlot.Weapon] = "wayfarer_blade";
            equipped[EquipmentSlot.Chest] = "travelers_coat";
        }

        public int GetQuantity(string itemId)
        {
            ItemStack stack = stacks.Find(entry => entry.ItemId == itemId);
            return stack != null ? stack.Quantity : 0;
        }

        public bool AddItem(string itemId, int quantity = 1)
        {
            if (quantity <= 0 || !RpgItemCatalog.TryGet(itemId, out RpgItemDefinition definition))
                return false;

            ItemStack existing = stacks.Find(entry => entry.ItemId == itemId);
            if (existing != null)
            {
                if (quantity > definition.MaxStack - existing.Quantity)
                    return false;
                existing.Quantity += quantity;
            }
            else
            {
                if (stacks.Count >= SlotCapacity || quantity > definition.MaxStack)
                    return false;
                stacks.Add(new ItemStack(itemId, quantity));
            }

            Changed?.Invoke();
            return true;
        }

        public bool RemoveItem(string itemId, int quantity = 1)
        {
            ItemStack stack = stacks.Find(entry => entry.ItemId == itemId);
            if (stack == null || quantity <= 0 || stack.Quantity < quantity)
                return false;

            stack.Quantity -= quantity;
            if (stack.Quantity == 0)
            {
                stacks.Remove(stack);
                List<EquipmentSlot> emptySlots = new List<EquipmentSlot>();
                foreach (KeyValuePair<EquipmentSlot, string> pair in equipped)
                {
                    if (pair.Value == itemId)
                        emptySlots.Add(pair.Key);
                }
                foreach (EquipmentSlot slot in emptySlots)
                    equipped.Remove(slot);
            }

            Changed?.Invoke();
            return true;
        }

        public bool TryEquip(string itemId)
        {
            if (!RpgItemCatalog.TryGet(itemId, out RpgItemDefinition definition) ||
                definition.Slot == EquipmentSlot.None || GetQuantity(itemId) <= 0)
                return false;

            equipped[definition.Slot] = itemId;
            Changed?.Invoke();
            return true;
        }

        public bool IsEquipped(string itemId)
        {
            foreach (KeyValuePair<EquipmentSlot, string> pair in equipped)
            {
                if (pair.Value == itemId)
                    return true;
            }
            return false;
        }

        public string GetEquippedItem(EquipmentSlot slot)
        {
            return equipped.TryGetValue(slot, out string itemId) ? itemId : null;
        }

        public bool TryUseFirstConsumable(PlayerVitals vitals)
        {
            for (int i = 0; i < stacks.Count; i++)
            {
                if (!RpgItemCatalog.TryGet(stacks[i].ItemId, out RpgItemDefinition definition) ||
                    definition.Type != RpgItemType.Consumable)
                    continue;
                return TryUse(definition.Id, vitals);
            }
            return false;
        }

        public bool TryUse(string itemId, PlayerVitals vitals)
        {
            if (vitals == null || GetQuantity(itemId) <= 0 ||
                !RpgItemCatalog.TryGet(itemId, out RpgItemDefinition definition) ||
                definition.Type != RpgItemType.Consumable)
                return false;

            if (!vitals.TryRestore(definition.HealAmount, definition.StaminaAmount))
                return false;

            return RemoveItem(itemId, 1);
        }

        public bool TrySpendGold(int amount)
        {
            if (amount < 0 || Gold < amount)
                return false;

            Gold -= amount;
            Changed?.Invoke();
            return true;
        }

        public void AddGold(int amount)
        {
            if (amount <= 0)
                return;

            Gold = (int)Math.Min(999999L, (long)Gold + amount);
            Changed?.Invoke();
        }

        public List<ItemStack> CreateStackSnapshot()
        {
            List<ItemStack> snapshot = new List<ItemStack>(stacks.Count);
            foreach (ItemStack stack in stacks)
                snapshot.Add(new ItemStack(stack.ItemId, stack.Quantity));
            return snapshot;
        }

        public List<EquippedItem> CreateEquipmentSnapshot()
        {
            List<EquippedItem> snapshot = new List<EquippedItem>(equipped.Count);
            foreach (KeyValuePair<EquipmentSlot, string> entry in equipped)
                snapshot.Add(new EquippedItem(entry.Key, entry.Value));
            return snapshot;
        }

        public void RestoreState(List<ItemStack> savedStacks, List<EquippedItem> savedEquipment, int gold)
        {
            stacks.Clear();
            equipped.Clear();
            Gold = Mathf.Clamp(gold, 0, 999999);

            if (savedStacks != null)
            {
                foreach (ItemStack saved in savedStacks)
                {
                    if (saved == null || saved.Quantity <= 0 || !RpgItemCatalog.TryGet(saved.ItemId, out RpgItemDefinition definition))
                        continue;

                    int quantity = Mathf.Min(saved.Quantity, definition.MaxStack);
                    ItemStack existing = stacks.Find(entry => entry.ItemId == saved.ItemId);
                    if (existing == null)
                    {
                        if (stacks.Count >= SlotCapacity)
                            break;
                        stacks.Add(new ItemStack(saved.ItemId, quantity));
                    }
                    else
                        existing.Quantity += Mathf.Min(quantity, definition.MaxStack - existing.Quantity);
                }
            }

            if (savedEquipment != null)
            {
                foreach (EquippedItem saved in savedEquipment)
                {
                    if (saved == null || saved.Slot == EquipmentSlot.None || GetQuantity(saved.ItemId) <= 0 ||
                        !RpgItemCatalog.TryGet(saved.ItemId, out RpgItemDefinition definition) || definition.Slot != saved.Slot)
                        continue;
                    equipped[saved.Slot] = saved.ItemId;
                }
            }

            Changed?.Invoke();
        }

        private void AddItemInternal(string itemId, int quantity)
        {
            stacks.Add(new ItemStack(itemId, quantity));
        }

        private float GetEquippedBonus(EquipmentSlot slot, bool attack)
        {
            if (!equipped.TryGetValue(slot, out string itemId) || !RpgItemCatalog.TryGet(itemId, out RpgItemDefinition definition))
                return 0f;
            return attack ? definition.AttackBonus : definition.DefenseBonus;
        }

        private float GetEquippedDefense()
        {
            float total = 0f;
            foreach (KeyValuePair<EquipmentSlot, string> pair in equipped)
            {
                if (RpgItemCatalog.TryGet(pair.Value, out RpgItemDefinition definition))
                    total += definition.DefenseBonus;
            }
            return total;
        }
    }
}
