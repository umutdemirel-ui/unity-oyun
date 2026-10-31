using Fellhaven.Core;
using Fellhaven.World;
using UnityEngine;

namespace Fellhaven.Player
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        [SerializeField] private float walkSpeed = 4.2f;
        [SerializeField] private float sprintSpeed = 6.8f;
        [SerializeField] private float jumpHeight = 1.45f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private float dodgeSpeed = 10.5f;
        [SerializeField] private float dodgeDuration = 0.42f;
        [SerializeField] private float rotationSpeed = 16f;

        private CharacterController characterController;
        private PrototypeInput input;
        private PlayerVitals vitals;
        private PlayerInventory inventory;
        private PlayerCombat combat;
        private ProceduralLocomotion locomotion;
        private PrototypeGameManager gameManager;
        private float verticalVelocity;
        private float dodgeUntil;
        private Vector3 dodgeDirection;

        public bool IsDodging => Time.time < dodgeUntil;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            input = GetComponent<PrototypeInput>();
            vitals = GetComponent<PlayerVitals>();
            inventory = GetComponent<PlayerInventory>();
            combat = GetComponent<PlayerCombat>();
            locomotion = GetComponent<ProceduralLocomotion>();
        }

        public void SetGameManager(PrototypeGameManager manager)
        {
            gameManager = manager;
        }

        public void SetLocomotion(ProceduralLocomotion actorLocomotion)
        {
            locomotion = actorLocomotion;
        }

        public void SetInventory(PlayerInventory playerInventory)
        {
            inventory = playerInventory;
        }

        public void ResetMovement()
        {
            verticalVelocity = 0f;
            dodgeUntil = 0f;
            dodgeDirection = Vector3.zero;
            locomotion?.SetMovement(0f);
        }

        private void Update()
        {
            if (inventory == null)
                inventory = GetComponent<PlayerInventory>();

            if (vitals == null || input == null)
                return;

            if (vitals.IsDead)
            {
                locomotion?.SetMovement(0f);
                if (input.RestartPressed)
                    gameManager?.RestartEncounter();
                return;
            }

            if (input.InventoryOpen)
            {
                locomotion?.SetMovement(0f);
                return;
            }

            if (input.SavePressed)
                gameManager?.SaveNow();

            if (input.PotionPressed)
                inventory?.TryUseFirstConsumable(vitals);

            if (input.InteractPressed)
                WorldPickup.FindNearest(transform.position, 2.8f)?.TryCollect(inventory);

            Camera camera = Camera.main;
            Vector3 cameraForward = camera != null ? camera.transform.forward : transform.forward;
            Vector3 cameraRight = camera != null ? camera.transform.right : transform.right;
            cameraForward.y = 0f;
            cameraRight.y = 0f;
            cameraForward.Normalize();
            cameraRight.Normalize();

            Vector2 moveInput = Vector2.ClampMagnitude(input.Move, 1f);
            Vector3 moveDirection = cameraForward * moveInput.y + cameraRight * moveInput.x;
            if (moveDirection.sqrMagnitude > 1f)
                moveDirection.Normalize();

            if (input.DodgePressed && Time.time >= dodgeUntil && vitals.SpendStamina(26f, 1.0f))
            {
                dodgeDirection = moveDirection.sqrMagnitude > 0.05f ? moveDirection.normalized : transform.forward;
                dodgeUntil = Time.time + dodgeDuration;
            }

            bool canSprint = input.SprintHeld && vitals.Stamina > 1f && moveInput.sqrMagnitude > 0.05f && !combat.IsBlocking;
            locomotion?.SetMovement(moveInput.magnitude, canSprint);
            float speed = canSprint
                ? sprintSpeed
                : walkSpeed;
            if (canSprint)
                vitals.SpendStamina(10f * Time.deltaTime, 0.3f);

            Vector3 planarVelocity = moveDirection * speed;
            if (Time.time < dodgeUntil)
                planarVelocity = dodgeDirection * dodgeSpeed;
            else if (combat.IsBlocking)
                planarVelocity *= 0.38f;

            if (characterController.isGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;

            if (input.JumpPressed && characterController.isGrounded)
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);

            verticalVelocity += gravity * Time.deltaTime;
            Vector3 velocity = planarVelocity + Vector3.up * verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);

            if (combat.LockedTarget != null && combat.LockedTarget.IsAlive && moveInput.sqrMagnitude < 0.03f)
            {
                Vector3 toTarget = combat.LockedTarget.transform.position - transform.position;
                toTarget.y = 0f;
                if (toTarget.sqrMagnitude > 0.01f)
                    RotateToward(toTarget);
            }
            else if (moveDirection.sqrMagnitude > 0.02f)
            {
                RotateToward(moveDirection);
            }
        }

        private void RotateToward(Vector3 direction)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
        }
    }
}
