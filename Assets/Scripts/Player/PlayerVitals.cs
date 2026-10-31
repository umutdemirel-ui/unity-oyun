using System;
using UnityEngine;

namespace Fellhaven.Player
{
    public sealed class PlayerVitals : MonoBehaviour
    {
        [SerializeField] private float maxHealth = 100f;
        [SerializeField] private float maxStamina = 100f;
        [SerializeField] private float staminaRecoveryPerSecond = 22f;

        private float baseMaxHealth;
        private float baseMaxStamina;
        private float recoveryBlockedUntil;

        public float Health { get; private set; }
        public float Stamina { get; private set; }
        public float MaxHealth => maxHealth;
        public float MaxStamina => maxStamina;
        public bool IsDead { get; private set; }

        public event Action Changed;
        public event Action Died;

        private void Awake()
        {
            baseMaxHealth = maxHealth;
            baseMaxStamina = maxStamina;
            Health = maxHealth;
            Stamina = maxStamina;
        }

        private void Update()
        {
            if (IsDead || Time.time < recoveryBlockedUntil || Stamina >= maxStamina)
                return;

            Stamina = Mathf.Min(maxStamina, Stamina + staminaRecoveryPerSecond * Time.deltaTime);
            Changed?.Invoke();
        }

        public bool SpendStamina(float amount, float recoveryDelay = 0.65f)
        {
            if (IsDead || Stamina < amount)
                return false;

            Stamina -= amount;
            recoveryBlockedUntil = Time.time + recoveryDelay;
            Changed?.Invoke();
            return true;
        }

        public void TakeDamage(float amount)
        {
            if (IsDead)
                return;

            Health = Mathf.Max(0f, Health - Mathf.Max(0f, amount));
            Changed?.Invoke();
            if (Health <= 0f)
            {
                IsDead = true;
                Died?.Invoke();
            }
        }

        public bool TryRestore(float healthAmount, float staminaAmount)
        {
            float restoredHealth = Mathf.Clamp(healthAmount, 0f, maxHealth - Health);
            float restoredStamina = Mathf.Clamp(staminaAmount, 0f, maxStamina - Stamina);
            if (restoredHealth <= 0f && restoredStamina <= 0f)
                return false;

            Health += restoredHealth;
            Stamina += restoredStamina;
            recoveryBlockedUntil = Time.time + 0.5f;
            Changed?.Invoke();
            return true;
        }

        public void ApplyLevel(int level)
        {
            int bonusLevels = Mathf.Max(0, level - 1);
            maxHealth = baseMaxHealth + bonusLevels * 10f;
            maxStamina = baseMaxStamina + bonusLevels * 5f;
            Health = Mathf.Min(Health, maxHealth);
            Stamina = Mathf.Min(Stamina, maxStamina);
            Changed?.Invoke();
        }

        public void Restore()
        {
            Health = maxHealth;
            Stamina = maxStamina;
            IsDead = false;
            recoveryBlockedUntil = 0f;
            Changed?.Invoke();
        }

        public void Restore(float health, float stamina)
        {
            Health = Mathf.Clamp(health, 0f, maxHealth);
            Stamina = Mathf.Clamp(stamina, 0f, maxStamina);
            IsDead = Health <= 0f;
            recoveryBlockedUntil = Time.time + 0.65f;
            Changed?.Invoke();
        }
    }
}
