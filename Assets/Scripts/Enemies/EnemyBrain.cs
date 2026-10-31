using System.Collections;
using Fellhaven.Core;
using Fellhaven.Player;
using UnityEngine;

namespace Fellhaven.Enemies
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class EnemyBrain : MonoBehaviour
    {
        private enum BrainState { Patrol, Chase, Attack, Search, Return }

        [SerializeField] private float maxHealth = 90f;
        [SerializeField] private float patrolSpeed = 1.6f;
        [SerializeField] private float chaseSpeed = 3.1f;
        [SerializeField] private float detectionRange = 13f;
        [SerializeField] private float attackRange = 2f;
        [SerializeField] private float attackDamage = 17f;
        [SerializeField] private float attackCooldown = 1.7f;

        private CharacterController controller;
        private Transform visualRoot;
        private Transform weaponPivot;
        private ProceduralLocomotion locomotion;
        private Material armorMaterial;
        private PlayerVitals playerVitals;
        private PlayerCombat playerCombat;
        private PrototypeGameManager gameManager;
        private Vector3 homePosition;
        private Vector3 lastKnownPosition;
        private Vector3 knockbackVelocity;
        private Vector3[] patrolPoints;
        private int patrolIndex;
        private float health;
        private Quaternion weaponRestRotation;
        private float nextAttackTime;
        private float lostPlayerAt;
        private bool isAlive = true;
        private BrainState state = BrainState.Patrol;

        public string DisplayName { get; private set; } = "Ashen Marauder";
        public float Health => health;
        public float MaxHealth => maxHealth;
        public bool IsAlive => isAlive;
        public string StateLabel => state.ToString();

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            health = maxHealth;
            homePosition = transform.position;
        }

        public void Configure(PlayerVitals vitals, PlayerCombat combat, PrototypeGameManager manager,
                              Transform visuals, Transform weapon, Material armor, ProceduralLocomotion actorLocomotion,
                              Vector3[] route)
        {
            playerVitals = vitals;
            playerCombat = combat;
            gameManager = manager;
            visualRoot = visuals;
            weaponPivot = weapon;
            if (weaponPivot != null)
                weaponRestRotation = weaponPivot.localRotation;
            armorMaterial = armor;
            locomotion = actorLocomotion;
            patrolPoints = route;
        }

        private void Update()
        {
            if (!isAlive || playerVitals == null || playerVitals.IsDead)
            {
                locomotion?.SetMovement(0f);
                return;
            }

            locomotion?.SetMovement(0f);

            float distanceToPlayer = Vector3.Distance(transform.position, playerVitals.transform.position);
            if (distanceToPlayer <= detectionRange)
            {
                lastKnownPosition = playerVitals.transform.position;
                state = distanceToPlayer <= attackRange ? BrainState.Attack : BrainState.Chase;
            }
            else if (state == BrainState.Chase || state == BrainState.Attack)
            {
                state = BrainState.Search;
                lostPlayerAt = Time.time;
            }

            switch (state)
            {
                case BrainState.Patrol:
                    Patrol();
                    break;
                case BrainState.Chase:
                    MoveToward(playerVitals.transform.position, chaseSpeed);
                    break;
                case BrainState.Attack:
                    Face(playerVitals.transform.position);
                    if (Time.time >= nextAttackTime)
                        StartCoroutine(AttackRoutine());
                    break;
                case BrainState.Search:
                    MoveToward(lastKnownPosition, patrolSpeed);
                    if (Vector3.Distance(transform.position, lastKnownPosition) < 1f || Time.time - lostPlayerAt > 5.5f)
                        state = BrainState.Return;
                    break;
                case BrainState.Return:
                    MoveToward(homePosition, patrolSpeed);
                    if (Vector3.Distance(transform.position, homePosition) < 0.8f)
                        state = BrainState.Patrol;
                    break;
            }

            if (knockbackVelocity.sqrMagnitude > 0.04f)
            {
                controller.Move(knockbackVelocity * Time.deltaTime);
                knockbackVelocity = Vector3.MoveTowards(knockbackVelocity, Vector3.zero, 13f * Time.deltaTime);
            }
        }

        public void ReceiveHit(float damage, Vector3 attackerPosition, bool heavy)
        {
            if (!isAlive)
                return;

            health = Mathf.Max(0f, health - damage);
            Vector3 away = transform.position - attackerPosition;
            away.y = 0f;
            if (away.sqrMagnitude > 0.01f)
                knockbackVelocity = away.normalized * (heavy ? 4.2f : 2.2f);

            if (armorMaterial != null)
                StartCoroutine(FlashHit());

            state = BrainState.Chase;
            if (health <= 0f)
                StartCoroutine(DeathRoutine());
        }

        public void ResetEncounter()
        {
            StopAllCoroutines();
            isAlive = true;
            health = maxHealth;
            state = BrainState.Patrol;
            patrolIndex = 0;
            nextAttackTime = 0f;
            knockbackVelocity = Vector3.zero;
            transform.position = homePosition;
            transform.rotation = Quaternion.identity;
            if (visualRoot != null)
                visualRoot.localRotation = Quaternion.identity;
            if (weaponPivot != null)
                weaponPivot.localRotation = weaponRestRotation;
            locomotion?.SetMovement(0f);
            locomotion?.SetAttacking(false);
            if (controller != null)
                controller.enabled = true;
        }

        public void RestoreDefeated()
        {
            StopAllCoroutines();
            isAlive = false;
            health = 0f;
            state = BrainState.Patrol;
            if (controller != null)
                controller.enabled = false;
            if (visualRoot != null)
                visualRoot.localRotation = Quaternion.Euler(78f, 0f, 0f);
            locomotion?.SetMovement(0f);
            locomotion?.SetAttacking(false);
        }

        private void Patrol()
        {
            if (patrolPoints == null || patrolPoints.Length == 0)
                return;

            Vector3 next = patrolPoints[patrolIndex];
            MoveToward(next, patrolSpeed);
            if (Vector3.Distance(transform.position, next) < 0.55f)
                patrolIndex = (patrolIndex + 1) % patrolPoints.Length;
        }

        private void MoveToward(Vector3 destination, float speed)
        {
            Vector3 delta = destination - transform.position;
            delta.y = 0f;
            if (delta.sqrMagnitude < 0.02f)
                return;

            Vector3 direction = delta.normalized;
            locomotion?.SetMovement(Mathf.Clamp01(speed / chaseSpeed), speed > chaseSpeed);
            Face(destination);
            controller.Move(direction * speed * Time.deltaTime);
        }

        private void Face(Vector3 destination)
        {
            Vector3 direction = destination - transform.position;
            direction.y = 0f;
            if (direction.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), 8f * Time.deltaTime);
        }

        private IEnumerator AttackRoutine()
        {
            nextAttackTime = Time.time + attackCooldown;
            locomotion?.SetAttacking(true);
            if (weaponPivot != null)
            {
                Quaternion rest = weaponPivot.localRotation;
                weaponPivot.localRotation = rest * Quaternion.Euler(0f, 0f, -88f);
                yield return new WaitForSeconds(0.32f);
                weaponPivot.localRotation = rest * Quaternion.Euler(0f, 0f, 72f);

                if (playerVitals != null && !playerVitals.IsDead &&
                    Vector3.Distance(transform.position, playerVitals.transform.position) <= attackRange + 0.25f)
                {
                    playerCombat.TryBlockIncomingDamage(attackDamage, transform.position);
                }

                yield return new WaitForSeconds(0.19f);
                weaponPivot.localRotation = rest;
            }
            else
            {
                yield return new WaitForSeconds(0.35f);
                if (playerVitals != null && !playerVitals.IsDead &&
                    Vector3.Distance(transform.position, playerVitals.transform.position) <= attackRange + 0.25f)
                    playerCombat.TryBlockIncomingDamage(attackDamage, transform.position);
            }
            locomotion?.SetAttacking(false);
        }

        private IEnumerator FlashHit()
        {
            Color original = armorMaterial.color;
            armorMaterial.color = new Color(1f, 0.45f, 0.34f);
            yield return new WaitForSeconds(0.09f);
            if (armorMaterial != null)
                armorMaterial.color = original;
        }

        private IEnumerator DeathRoutine()
        {
            isAlive = false;
            if (controller != null)
                controller.enabled = false;

            float elapsed = 0f;
            Quaternion start = visualRoot != null ? visualRoot.localRotation : Quaternion.identity;
            Quaternion end = start * Quaternion.Euler(78f, 0f, 0f);
            while (elapsed < 0.65f && visualRoot != null)
            {
                elapsed += Time.deltaTime;
                visualRoot.localRotation = Quaternion.Slerp(start, end, elapsed / 0.65f);
                yield return null;
            }

            gameManager?.OnEnemyDefeated(this);
        }
    }
}
