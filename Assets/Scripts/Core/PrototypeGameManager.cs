using Fellhaven.Enemies;
using Fellhaven.Player;
using UnityEngine;

namespace Fellhaven.Core
{
    public sealed class PrototypeGameManager : MonoBehaviour
    {
        public PlayerVitals Player { get; private set; }
        public EnemyBrain Enemy { get; private set; }
        public PlayerInventory Inventory { get; private set; }
        public PlayerProgression Progression { get; private set; }
        public bool EncounterComplete { get; private set; }
        public string SaveStatus { get; private set; } = "Not saved yet";

        private float lastSaveTime;

        public string Objective => EncounterComplete
            ? "The trail is clear. Your journey starts here."
            : "Defeat the marauder at the old camp.";

        public void Configure(PlayerVitals player, EnemyBrain enemy, PlayerInventory inventory,
                              PlayerProgression progression)
        {
            Player = player;
            Enemy = enemy;
            Inventory = inventory;
            Progression = progression;

            if (PlayerSaveStore.TryLoad(out PlayerSaveData saved, out string loadError))
            {
                Progression.RestoreState(saved.Level, saved.Experience);
                Inventory.RestoreState(saved.Inventory, saved.Equipment, saved.Gold);
                Vector3 savedPosition = saved.Position;
                Player.transform.position = new Vector3(
                    Mathf.Clamp(savedPosition.x, -42f, 42f),
                    Mathf.Clamp(savedPosition.y, -1f, 10f),
                    Mathf.Clamp(savedPosition.z, -42f, 42f));
                Player.Restore(saved.Health, saved.Stamina);
                if (saved.MarauderDefeated)
                {
                    EncounterComplete = true;
                    Enemy.RestoreDefeated();
                }
                SaveStatus = "Adventure loaded";
            }
            else if (!string.IsNullOrEmpty(loadError))
            {
                SaveStatus = "Save could not be loaded";
                Debug.LogWarning($"Fellhaven save could not be loaded: {loadError}");
            }

            Inventory.Changed += SaveAfterInventoryChange;
            Progression.Changed += SaveAfterProgressionChange;
            Player.Died += SaveAfterDeath;
            lastSaveTime = Time.realtimeSinceStartup;
        }

        public void OnEnemyDefeated(EnemyBrain enemy)
        {
            if (enemy != Enemy || EncounterComplete)
                return;

            EncounterComplete = true;
            Progression?.AddExperience(60);
            Inventory?.AddGold(35);
            Inventory?.AddItem("marauder_token");
            Inventory?.AddItem("healing_draught");
            Inventory?.AddItem("marauder_cleaver");
            Inventory?.AddItem("marauder_vest");
            SaveNow();
        }

        public bool SaveNow()
        {
            if (Player == null || Inventory == null || Progression == null)
                return false;

            PlayerSaveData data = new PlayerSaveData
            {
                Position = Player.transform.position,
                Level = Progression.Level,
                Experience = Progression.Experience,
                Health = Player.Health,
                Stamina = Player.Stamina,
                Gold = Inventory.Gold,
                MarauderDefeated = EncounterComplete,
                Inventory = Inventory.CreateStackSnapshot(),
                Equipment = Inventory.CreateEquipmentSnapshot()
            };

            if (PlayerSaveStore.TrySave(data, out string error))
            {
                lastSaveTime = Time.realtimeSinceStartup;
                SaveStatus = $"Saved at {System.DateTime.Now:HH:mm}";
                return true;
            }

            SaveStatus = "Save failed";
            Debug.LogWarning($"Fellhaven save could not be written: {error}");
            return false;
        }

        private void Update()
        {
            if (Player != null && Time.realtimeSinceStartup - lastSaveTime >= 60f)
                SaveNow();
        }

        private void SaveAfterDeath()
        {
            SaveNow();
        }

        private void SaveAfterInventoryChange()
        {
            SaveNow();
        }

        private void SaveAfterProgressionChange()
        {
            SaveNow();
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused)
                SaveNow();
        }

        private void OnApplicationQuit()
        {
            SaveNow();
        }

        private void OnDestroy()
        {
            if (Inventory != null)
                Inventory.Changed -= SaveAfterInventoryChange;
            if (Progression != null)
                Progression.Changed -= SaveAfterProgressionChange;
            if (Player != null)
                Player.Died -= SaveAfterDeath;
        }

        public void RestartEncounter()
        {
            if (Player == null || Enemy == null)
                return;

            Player.transform.position = new Vector3(0f, 0.02f, 0f);
            Player.transform.rotation = Quaternion.identity;
            Player.GetComponent<PlayerController>()?.ResetMovement();
            Player.GetComponent<PlayerCombat>()?.ResetCombat();
            Player.Restore();
            Enemy.ResetEncounter();
            EncounterComplete = false;
            SaveNow();
        }
    }
}
