using System.Collections;
using Fellhaven.Core;
using Fellhaven.Enemies;
using UnityEngine;

namespace Fellhaven.Player
{
    public sealed class PlayerCombat : MonoBehaviour
    {
        [SerializeField] private float lightDamage = 24f;
        [SerializeField] private float heavyDamage = 43f;
        [SerializeField] private float lightStaminaCost = 13f;
        [SerializeField] private float heavyStaminaCost = 25f;
        [SerializeField] private float blockStaminaCost = 12f;

        private PrototypeInput input;
        private PlayerVitals vitals;
        private PlayerInventory inventory;
        private PlayerController playerController;
        private ProceduralLocomotion locomotion;
        private Transform weaponPivot;
        private Quaternion weaponRestRotation;
        private float nextAttackTime;

        public EnemyBrain LockedTarget { get; private set; }
        public bool IsAttacking { get; private set; }
        public bool IsBlocking => input != null && input.BlockHeld && !IsAttacking && vitals != null && vitals.Stamina > 0f;

        private void Awake()
        {
            input = GetComponent<PrototypeInput>();
            vitals = GetComponent<PlayerVitals>();
            inventory = GetComponent<PlayerInventory>();
            playerController = GetComponent<PlayerController>();
            locomotion = GetComponent<ProceduralLocomotion>();
        }

        public void SetWeaponPivot(Transform pivot)
        {
            weaponPivot = pivot;
            weaponRestRotation = pivot.localRotation;
        }

        public void SetInventory(PlayerInventory playerInventory)
        {
            inventory = playerInventory;
        }

        public void ResetCombat()
        {
            StopAllCoroutines();
            IsAttacking = false;
            nextAttackTime = 0f;
            LockedTarget = null;
            if (weaponPivot != null)
                weaponPivot.localRotation = weaponRestRotation;
            locomotion?.SetAttacking(false);
        }

        private void Update()
        {
            if (inventory == null)
                inventory = GetComponent<PlayerInventory>();

            if (input == null || vitals == null || vitals.IsDead)
                return;

            if (input.InventoryOpen)
                return;

            if (LockedTarget != null && !LockedTarget.IsAlive)
                LockedTarget = null;

            if (input.TargetLockPressed)
                ToggleTargetLock();

            if (Time.time < nextAttackTime || IsAttacking || IsBlocking)
                return;

            if (input.HeavyAttackPressed)
                StartCoroutine(AttackRoutine(true));
            else if (input.LightAttackPressed)
                StartCoroutine(AttackRoutine(false));
        }

        public bool TryBlockIncomingDamage(float damage, Vector3 attackerPosition)
        {
            if (playerController != null && playerController.IsDodging)
                return true;

            Vector3 towardAttacker = attackerPosition - transform.position;
            towardAttacker.y = 0f;
            bool facingAttacker = towardAttacker.sqrMagnitude > 0.01f &&
                                  Vector3.Angle(transform.forward, towardAttacker) < 105f;

            if (IsBlocking && facingAttacker && vitals.SpendStamina(blockStaminaCost, 0.8f))
            {
                vitals.TakeDamage(ApplyArmor(damage * 0.28f));
                return true;
            }

            vitals.TakeDamage(ApplyArmor(damage));
            return false;
        }

        private void ToggleTargetLock()
        {
            if (LockedTarget != null)
            {
                LockedTarget = null;
                return;
            }

            EnemyBrain[] enemies = FindObjectsByType<EnemyBrain>(FindObjectsSortMode.None);
            float nearest = 18f;
            foreach (EnemyBrain enemy in enemies)
            {
                if (!enemy.IsAlive)
                    continue;

                float distance = Vector3.Distance(transform.position, enemy.transform.position);
                if (distance < nearest)
                {
                    nearest = distance;
                    LockedTarget = enemy;
                }
            }
        }

        private IEnumerator AttackRoutine(bool heavy)
        {
            float staminaCost = heavy ? heavyStaminaCost : lightStaminaCost;
            if (!vitals.SpendStamina(staminaCost))
                yield break;

            IsAttacking = true;
            locomotion?.SetAttacking(true);
            nextAttackTime = Time.time + (heavy ? 0.95f : 0.48f);

            if (weaponPivot != null)
            {
                float windup = heavy ? 0.18f : 0.11f;
                Quaternion loaded = weaponRestRotation * Quaternion.Euler(0f, 0f, heavy ? -115f : -75f);
                yield return RotateWeapon(weaponPivot.localRotation, loaded, windup);
                yield return new WaitForSeconds(heavy ? 0.14f : 0.09f);
            }
            else
            {
                yield return new WaitForSeconds(0.12f);
            }

            DealAttackDamage(heavy);

            if (weaponPivot != null)
            {
                Quaternion followThrough = weaponRestRotation * Quaternion.Euler(0f, 0f, heavy ? 92f : 68f);
                yield return RotateWeapon(weaponPivot.localRotation, followThrough, 0.12f);
                yield return RotateWeapon(weaponPivot.localRotation, weaponRestRotation, 0.14f);
            }

            IsAttacking = false;
            locomotion?.SetAttacking(false);
        }

        private IEnumerator RotateWeapon(Quaternion from, Quaternion to, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float blend = Mathf.Clamp01(elapsed / duration);
                weaponPivot.localRotation = Quaternion.Slerp(from, to, blend * blend * (3f - 2f * blend));
                yield return null;
            }
            weaponPivot.localRotation = to;
        }

        private void DealAttackDamage(bool heavy)
        {
            float reach = heavy ? 3.1f : 2.6f;
            float damage = (heavy ? heavyDamage : lightDamage) + (inventory != null ? inventory.WeaponAttackBonus : 0f);
            EnemyBrain target = LockedTarget != null && LockedTarget.IsAlive ? LockedTarget : FindFrontTarget(reach);

            if (target == null || Vector3.Distance(transform.position, target.transform.position) > reach)
                return;

            Vector3 toTarget = target.transform.position - transform.position;
            toTarget.y = 0f;
            float facingLimit = LockedTarget == target ? 125f : 88f;
            if (toTarget.sqrMagnitude > 0.01f && Vector3.Angle(transform.forward, toTarget) > facingLimit)
                return;

            target.ReceiveHit(damage, transform.position, heavy);
        }

        private float ApplyArmor(float damage)
        {
            float armor = inventory != null ? inventory.DefenseBonus : 0f;
            return damage * (100f / (100f + armor * 12f));
        }

        private EnemyBrain FindFrontTarget(float reach)
        {
            EnemyBrain[] enemies = FindObjectsByType<EnemyBrain>(FindObjectsSortMode.None);
            EnemyBrain best = null;
            float nearest = reach;

            foreach (EnemyBrain enemy in enemies)
            {
                if (!enemy.IsAlive)
                    continue;

                Vector3 offset = enemy.transform.position - transform.position;
                offset.y = 0f;
                float distance = offset.magnitude;
                if (distance < nearest && Vector3.Angle(transform.forward, offset) < 88f)
                {
                    nearest = distance;
                    best = enemy;
                }
            }

            return best;
        }
    }
}
