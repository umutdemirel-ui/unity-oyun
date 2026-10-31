using UnityEngine;
using UnityEngine.InputSystem;

namespace Fellhaven.Core
{
    /// <summary>Owns the prototype's device-independent actions.</summary>
    public sealed class PrototypeInput : MonoBehaviour
    {
        private InputAction move;
        private InputAction look;
        private InputAction jump;
        private InputAction sprint;
        private InputAction dodge;
        private InputAction lightAttack;
        private InputAction heavyAttack;
        private InputAction block;
        private InputAction targetLock;
        private InputAction restart;
        private InputAction inventory;
        private InputAction potion;
        private InputAction interact;
        private InputAction save;

        public Vector2 Move => move.ReadValue<Vector2>();
        public Vector2 Look => look.ReadValue<Vector2>();
        public bool JumpPressed => jump.WasPressedThisFrame();
        public bool SprintHeld => sprint.IsPressed();
        public bool DodgePressed => dodge.WasPressedThisFrame();
        public bool LightAttackPressed => lightAttack.WasPressedThisFrame();
        public bool HeavyAttackPressed => heavyAttack.WasPressedThisFrame();
        public bool BlockHeld => block.IsPressed();
        public bool TargetLockPressed => targetLock.WasPressedThisFrame();
        public bool RestartPressed => restart.WasPressedThisFrame();
        public bool PotionPressed => potion.WasPressedThisFrame();
        public bool InteractPressed => interact.WasPressedThisFrame();
        public bool SavePressed => save.WasPressedThisFrame();
        public bool InventoryOpen { get; private set; }

        public void CloseInventory()
        {
            InventoryOpen = false;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        public void ToggleInventory()
        {
            InventoryOpen = !InventoryOpen;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void Update()
        {
            if (inventory != null && inventory.WasPressedThisFrame())
                ToggleInventory();
        }

        private void Awake()
        {
            move = new InputAction("Move", InputActionType.Value);
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w")
                .With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a")
                .With("Right", "<Keyboard>/d");
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/upArrow")
                .With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/leftArrow")
                .With("Right", "<Keyboard>/rightArrow");
            move.AddBinding("<Gamepad>/leftStick");

            look = new InputAction("Look", InputActionType.Value);
            look.AddBinding("<Mouse>/delta");
            look.AddBinding("<Gamepad>/rightStick");

            jump = new InputAction("Jump", InputActionType.Button);
            jump.AddBinding("<Keyboard>/space");
            jump.AddBinding("<Gamepad>/buttonSouth");

            sprint = new InputAction("Sprint", InputActionType.Button);
            sprint.AddBinding("<Keyboard>/leftShift");
            sprint.AddBinding("<Gamepad>/leftStickPress");

            dodge = new InputAction("Dodge", InputActionType.Button);
            dodge.AddBinding("<Keyboard>/leftCtrl");
            dodge.AddBinding("<Gamepad>/buttonEast");

            lightAttack = new InputAction("Light Attack", InputActionType.Button);
            lightAttack.AddBinding("<Mouse>/leftButton");
            lightAttack.AddBinding("<Gamepad>/rightShoulder");

            heavyAttack = new InputAction("Heavy Attack", InputActionType.Button);
            heavyAttack.AddBinding("<Mouse>/rightButton");
            heavyAttack.AddBinding("<Gamepad>/buttonNorth");

            block = new InputAction("Block", InputActionType.Button);
            block.AddBinding("<Keyboard>/leftAlt");
            block.AddBinding("<Gamepad>/leftShoulder");

            targetLock = new InputAction("Target Lock", InputActionType.Button);
            targetLock.AddBinding("<Keyboard>/q");
            targetLock.AddBinding("<Gamepad>/rightStickPress");

            restart = new InputAction("Restart", InputActionType.Button);
            restart.AddBinding("<Keyboard>/r");
            restart.AddBinding("<Gamepad>/start");

            inventory = new InputAction("Inventory", InputActionType.Button);
            inventory.AddBinding("<Keyboard>/tab");
            inventory.AddBinding("<Keyboard>/i");
            potion = new InputAction("Use Potion", InputActionType.Button);
            potion.AddBinding("<Keyboard>/h");
            interact = new InputAction("Interact", InputActionType.Button);
            interact.AddBinding("<Keyboard>/e");
            save = new InputAction("Save", InputActionType.Button);
            save.AddBinding("<Keyboard>/f5");
        }

        private void OnEnable()
        {
            move?.Enable();
            look?.Enable();
            jump?.Enable();
            sprint?.Enable();
            dodge?.Enable();
            lightAttack?.Enable();
            heavyAttack?.Enable();
            block?.Enable();
            targetLock?.Enable();
            restart?.Enable();
            inventory?.Enable();
            potion?.Enable();
            interact?.Enable();
            save?.Enable();
        }

        private void OnDisable()
        {
            move?.Disable();
            look?.Disable();
            jump?.Disable();
            sprint?.Disable();
            dodge?.Disable();
            lightAttack?.Disable();
            heavyAttack?.Disable();
            block?.Disable();
            targetLock?.Disable();
            restart?.Disable();
            inventory?.Disable();
            potion?.Disable();
            interact?.Disable();
            save?.Disable();
            InventoryOpen = false;
        }

        private void OnDestroy()
        {
            move?.Dispose();
            look?.Dispose();
            jump?.Dispose();
            sprint?.Dispose();
            dodge?.Dispose();
            lightAttack?.Dispose();
            heavyAttack?.Dispose();
            block?.Dispose();
            targetLock?.Dispose();
            restart?.Dispose();
            inventory?.Dispose();
            potion?.Dispose();
            interact?.Dispose();
            save?.Dispose();
        }
    }
}
