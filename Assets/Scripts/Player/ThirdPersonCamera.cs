using Fellhaven.Core;
using Fellhaven.Enemies;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Fellhaven.Player
{
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        [SerializeField] private float distance = 6.2f;
        [SerializeField] private float lookSensitivity = 0.12f;
        [SerializeField] private float gamepadLookSpeed = 140f;
        [SerializeField] private float minPitch = -12f;
        [SerializeField] private float maxPitch = 58f;
        [SerializeField] private float followSharpness = 14f;

        private Transform target;
        private PlayerCombat combat;
        private PrototypeInput input;
        private float yaw = 20f;
        private float pitch = 18f;

        public void SetTarget(Transform followTarget, PlayerCombat playerCombat, PrototypeInput playerInput)
        {
            target = followTarget;
            combat = playerCombat;
            input = playerInput;
        }

        private void Start()
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            {
                if (input != null && input.InventoryOpen)
                {
                    input.CloseInventory();
                }
                else
                {
                    Cursor.lockState = Cursor.lockState == CursorLockMode.Locked
                        ? CursorLockMode.None
                        : CursorLockMode.Locked;
                    Cursor.visible = Cursor.lockState != CursorLockMode.Locked;
                }
            }

            Vector2 look = input != null ? input.Look : Vector2.zero;
            bool mouseMoved = Mouse.current != null && Mouse.current.delta.ReadValue().sqrMagnitude > 0.01f;
            float sensitivity = mouseMoved ? lookSensitivity : gamepadLookSpeed * Time.deltaTime;
            if (Cursor.lockState == CursorLockMode.Locked || !mouseMoved)
            {
                yaw += look.x * sensitivity;
                pitch -= look.y * sensitivity;
            }

            pitch = Mathf.Clamp(pitch, minPitch, maxPitch);
            Vector3 focusPoint = target.position + Vector3.up * 1.35f;
            Quaternion orbit = Quaternion.Euler(pitch, yaw, 0f);
            Vector3 desiredPosition = focusPoint - orbit * Vector3.forward * distance;

            if (combat != null && combat.LockedTarget != null && combat.LockedTarget.IsAlive)
            {
                EnemyBrain enemy = combat.LockedTarget;
                Vector3 midpoint = (focusPoint + enemy.transform.position + Vector3.up) * 0.5f;
                Vector3 toMidpoint = midpoint - desiredPosition;
                if (toMidpoint.sqrMagnitude > 0.01f)
                    orbit = Quaternion.Slerp(orbit, Quaternion.LookRotation(toMidpoint), 0.16f);
                desiredPosition = focusPoint - orbit * Vector3.forward * distance;
            }

            Vector3 fromFocus = desiredPosition - focusPoint;
            if (Physics.SphereCast(focusPoint, 0.22f, fromFocus.normalized, out RaycastHit hit, fromFocus.magnitude,
                                   Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore))
            {
                desiredPosition = focusPoint + fromFocus.normalized * Mathf.Max(0.5f, hit.distance - 0.15f);
            }

            float blend = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            transform.position = Vector3.Lerp(transform.position, desiredPosition, blend);
            transform.rotation = Quaternion.LookRotation(focusPoint - transform.position, Vector3.up);
        }
    }
}
