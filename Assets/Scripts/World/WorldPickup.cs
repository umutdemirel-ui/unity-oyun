using Fellhaven.Player;
using UnityEngine;

namespace Fellhaven.World
{
    public sealed class WorldPickup : MonoBehaviour
    {
        [SerializeField] private string itemId;
        [SerializeField] private int quantity = 1;

        public string ItemId => itemId;
        public int Quantity => quantity;
        public string DisplayName => RpgItemCatalog.TryGet(itemId, out RpgItemDefinition definition)
            ? definition.DisplayName
            : itemId;

        public void Configure(string id, int itemQuantity)
        {
            itemId = id;
            quantity = Mathf.Max(1, itemQuantity);
        }

        public bool TryCollect(PlayerInventory inventory)
        {
            if (inventory == null || !inventory.AddItem(itemId, quantity))
                return false;

            Destroy(gameObject);
            return true;
        }

        public static WorldPickup FindNearest(Vector3 position, float radius)
        {
            WorldPickup[] pickups = FindObjectsByType<WorldPickup>(FindObjectsSortMode.None);
            WorldPickup nearest = null;
            float nearestDistance = radius;
            foreach (WorldPickup pickup in pickups)
            {
                float distance = Vector3.Distance(position, pickup.transform.position);
                if (distance < nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = pickup;
                }
            }
            return nearest;
        }
    }
}
