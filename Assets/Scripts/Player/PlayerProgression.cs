using System;
using UnityEngine;

namespace Fellhaven.Player
{
    [RequireComponent(typeof(PlayerVitals))]
    public sealed class PlayerProgression : MonoBehaviour
    {
        public const int MaximumLevel = 50;

        private PlayerVitals vitals;

        public event Action Changed;
        public int Level { get; private set; } = 1;
        public int Experience { get; private set; }
        public int ExperienceToNext => 100 + (Level - 1) * 50;

        private void Awake()
        {
            vitals = GetComponent<PlayerVitals>();
        }

        public void AddExperience(int amount)
        {
            if (amount <= 0 || Level >= MaximumLevel)
                return;

            Experience += amount;
            while (Level < MaximumLevel && Experience >= ExperienceToNext)
            {
                Experience -= ExperienceToNext;
                Level++;
                vitals?.ApplyLevel(Level);
            }

            if (Level >= MaximumLevel)
                Experience = 0;

            Changed?.Invoke();
        }

        public void RestoreState(int level, int experience)
        {
            Level = Mathf.Clamp(level, 1, MaximumLevel);
            Experience = Level >= MaximumLevel
                ? 0
                : Mathf.Clamp(experience, 0, ExperienceToNext - 1);
            vitals?.ApplyLevel(Level);
            Changed?.Invoke();
        }
    }
}
