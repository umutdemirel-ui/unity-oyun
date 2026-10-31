using System;
using System.Collections.Generic;
using System.IO;
using Fellhaven.Player;
using UnityEngine;

namespace Fellhaven.Core
{
    [Serializable]
    public sealed class PlayerSaveData
    {
        public int Version = 1;
        public Vector3 Position;
        public int Level = 1;
        public int Experience;
        public float Health = 100f;
        public float Stamina = 100f;
        public int Gold;
        public bool MarauderDefeated;
        public List<ItemStack> Inventory = new List<ItemStack>();
        public List<EquippedItem> Equipment = new List<EquippedItem>();
    }

    public static class PlayerSaveStore
    {
        public const int CurrentVersion = 1;
        public static string FilePath => Path.Combine(Application.persistentDataPath, "fellhaven-first-light-save.json");

        public static bool TryLoad(out PlayerSaveData data, out string error)
        {
            data = null;
            error = null;
            try
            {
                if (!File.Exists(FilePath))
                    return false;

                string json = File.ReadAllText(FilePath);
                data = JsonUtility.FromJson<PlayerSaveData>(json);
                if (data == null || data.Version != CurrentVersion)
                {
                    data = null;
                    error = "The save file uses an unsupported version.";
                    return false;
                }
                return true;
            }
            catch (Exception exception)
            {
                error = exception.Message;
                data = null;
                return false;
            }
        }

        public static bool TrySave(PlayerSaveData data, out string error)
        {
            error = null;
            string temporaryPath = FilePath + ".tmp";
            string backupPath = FilePath + ".bak";
            try
            {
                data.Version = CurrentVersion;
                Directory.CreateDirectory(Application.persistentDataPath);
                File.WriteAllText(temporaryPath, JsonUtility.ToJson(data, true));

                if (File.Exists(FilePath))
                {
                    try
                    {
                        File.Replace(temporaryPath, FilePath, backupPath);
                        if (File.Exists(backupPath))
                            File.Delete(backupPath);
                    }
                    catch (PlatformNotSupportedException)
                    {
                        ReplaceWithRollback(temporaryPath, backupPath);
                    }
                    catch (IOException)
                    {
                        ReplaceWithRollback(temporaryPath, backupPath);
                    }
                }
                else
                {
                    File.Move(temporaryPath, FilePath);
                }

                return true;
            }
            catch (Exception exception)
            {
                error = exception.Message;
                return false;
            }
            finally
            {
                if (File.Exists(temporaryPath))
                    File.Delete(temporaryPath);
            }
        }

        private static void ReplaceWithRollback(string temporaryPath, string backupPath)
        {
            bool backedUp = false;
            try
            {
                if (File.Exists(backupPath))
                    File.Delete(backupPath);
                File.Move(FilePath, backupPath);
                backedUp = true;
                File.Move(temporaryPath, FilePath);
                File.Delete(backupPath);
            }
            catch
            {
                if (!File.Exists(FilePath) && backedUp && File.Exists(backupPath))
                    File.Move(backupPath, FilePath);
                throw;
            }
        }
    }
}
