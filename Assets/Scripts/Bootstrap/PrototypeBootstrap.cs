using Fellhaven.Core;
using Fellhaven.Enemies;
using Fellhaven.Player;
using Fellhaven.UI;
using Fellhaven.World;
using UnityEngine;

namespace Fellhaven.Bootstrap
{
    /// <summary>Assembles a small, asset-free encounter at runtime.</summary>
    public sealed class PrototypeBootstrap : MonoBehaviour
    {
        private bool built;

        private void Awake()
        {
            if (built)
                return;
            built = true;

            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.orientation = ScreenOrientation.LandscapeLeft;

            GameObject worldRoot = new GameObject("Prototype World");
            PrototypeWorldBuilder world = new PrototypeWorldBuilder(worldRoot.transform);
            world.Build();
            CreateWorldPickup(world);

            PrototypeGameManager manager = gameObject.AddComponent<PrototypeGameManager>();
            PlayerVitals playerVitals = CreatePlayer(world, manager, out PlayerCombat playerCombat,
                out PrototypeInput playerInput, out Transform playerVisuals, out ProceduralLocomotion playerLocomotion);
            PlayerInventory inventory = playerVitals.gameObject.AddComponent<PlayerInventory>();
            PlayerProgression progression = playerVitals.gameObject.AddComponent<PlayerProgression>();
            playerCombat.SetInventory(inventory);
            PlayerEquipmentVisuals equipmentVisuals = playerVitals.gameObject.AddComponent<PlayerEquipmentVisuals>();
            equipmentVisuals.Configure(inventory, playerVisuals);
            EnemyBrain enemy = CreateEnemy(world, playerVitals, playerCombat, manager);
            manager.Configure(playerVitals, enemy, inventory, progression);

            CreateCamera(playerVitals.transform, playerCombat, playerInput);
            PrototypeHUD hud = gameObject.AddComponent<PrototypeHUD>();
            hud.Configure(manager, world.TimeOfDay);

            PlayerController controller = playerVitals.GetComponent<PlayerController>();
            controller.SetGameManager(manager);
            controller.SetLocomotion(playerLocomotion);
            controller.SetInventory(inventory);

            playerVitals.transform.position = new Vector3(0f, 0.02f, 0f);
            playerVisuals.localPosition = Vector3.zero;
        }

        private void CreateWorldPickup(PrototypeWorldBuilder world)
        {
            GameObject herb = world.CreatePrimitive(PrimitiveType.Sphere, "Alder Herb Pickup",
                new Vector3(3f, 0.42f, 5.5f), new Vector3(0.46f, 0.56f, 0.46f),
                new Color(0.35f, 0.78f, 0.52f));
            herb.AddComponent<WorldPickup>().Configure("alder_herb", 1);
        }

        private PlayerVitals CreatePlayer(PrototypeWorldBuilder world, PrototypeGameManager manager,
            out PlayerCombat combat, out PrototypeInput input, out Transform visualRoot,
            out ProceduralLocomotion locomotion)
        {
            GameObject player = new GameObject("Wayfarer");
            player.transform.position = new Vector3(0f, 0.02f, 0f);
            CharacterController character = player.AddComponent<CharacterController>();
            character.height = 1.88f;
            character.radius = 0.38f;
            character.center = new Vector3(0f, 0.94f, 0f);
            character.stepOffset = 0.32f;
            character.slopeLimit = 48f;

            input = player.AddComponent<PrototypeInput>();
            PlayerVitals vitals = player.AddComponent<PlayerVitals>();
            combat = player.AddComponent<PlayerCombat>();
            player.AddComponent<PlayerController>();

            visualRoot = new GameObject("Wayfarer Model").transform;
            visualRoot.SetParent(player.transform, false);
            BuildActorModel(world, visualRoot, false, out Transform weaponPivot, out _, out locomotion);
            combat.SetWeaponPivot(weaponPivot);
            return vitals;
        }

        private EnemyBrain CreateEnemy(PrototypeWorldBuilder world, PlayerVitals playerVitals,
            PlayerCombat playerCombat, PrototypeGameManager manager)
        {
            GameObject enemy = new GameObject("Ashen Marauder");
            enemy.transform.position = new Vector3(0.5f, 0.02f, 17.5f);
            CharacterController character = enemy.AddComponent<CharacterController>();
            character.height = 1.9f;
            character.radius = 0.4f;
            character.center = new Vector3(0f, 0.95f, 0f);
            character.stepOffset = 0.28f;

            EnemyBrain brain = enemy.AddComponent<EnemyBrain>();
            Transform visuals = new GameObject("Marauder Model").transform;
            visuals.SetParent(enemy.transform, false);
            BuildActorModel(world, visuals, true, out Transform weaponPivot, out Material armorMaterial,
                out ProceduralLocomotion locomotion);

            Vector3[] route =
            {
                new Vector3(0.5f, 0.02f, 17.5f),
                new Vector3(4.5f, 0.02f, 15.1f),
                new Vector3(2.1f, 0.02f, 20.5f)
            };
            brain.Configure(playerVitals, playerCombat, manager, visuals, weaponPivot, armorMaterial, locomotion, route);
            return brain;
        }

        private void CreateCamera(Transform player, PlayerCombat combat, PrototypeInput input)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(0f, 3f, -6f);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.fieldOfView = 64f;
            camera.nearClipPlane = 0.08f;
            camera.farClipPlane = 180f;
            cameraObject.AddComponent<AudioListener>();
            ThirdPersonCamera follow = cameraObject.AddComponent<ThirdPersonCamera>();
            follow.SetTarget(player, combat, input);
        }

        private void BuildActorModel(PrototypeWorldBuilder world, Transform root, bool enemy,
            out Transform weaponPivot, out Material armorMaterial, out ProceduralLocomotion locomotion)
        {
            Color cloth = enemy ? new Color(0.35f, 0.19f, 0.17f) : new Color(0.17f, 0.31f, 0.34f);
            Color armor = enemy ? new Color(0.31f, 0.29f, 0.25f) : new Color(0.55f, 0.48f, 0.34f);
            Color leather = new Color(0.23f, 0.16f, 0.11f);
            Color steel = new Color(0.57f, 0.61f, 0.62f);
            armorMaterial = world.GetMaterial(enemy ? "Mat_MarauderArmor" : "Mat_WayfarerArmor", armor);

            AddPart(PrimitiveType.Capsule, "Body", new Vector3(0f, 0.98f, 0f), new Vector3(0.72f, 0.62f, 0.48f), cloth, root, world);
            AddPart(PrimitiveType.Sphere, "Chestplate", new Vector3(0f, 1.13f, 0.12f), new Vector3(0.75f, 0.55f, 0.32f), armor, root, world);
            AddPart(PrimitiveType.Sphere, "Head", new Vector3(0f, 1.74f, 0.04f), new Vector3(0.43f, 0.48f, 0.42f),
                new Color(0.66f, 0.53f, 0.41f), root, world);
            AddPart(PrimitiveType.Sphere, "Shoulder Left", new Vector3(-0.42f, 1.36f, 0.01f), new Vector3(0.35f, 0.28f, 0.38f), armor, root, world);
            AddPart(PrimitiveType.Sphere, "Shoulder Right", new Vector3(0.42f, 1.36f, 0.01f), new Vector3(0.35f, 0.28f, 0.38f), armor, root, world);
            Transform leftLeg = CreateLimb(world, root, "Left Leg", new Vector3(-0.2f, 0.67f, 0f), cloth,
                new Vector3(0.29f, 0.42f, 0.31f), new Vector3(0f, -0.24f, 0f));
            Transform rightLeg = CreateLimb(world, root, "Right Leg", new Vector3(0.2f, 0.67f, 0f), cloth,
                new Vector3(0.29f, 0.42f, 0.31f), new Vector3(0f, -0.24f, 0f));
            AddPart(PrimitiveType.Cube, "Boot Left", new Vector3(-0.2f, 0.12f, 0.12f), new Vector3(0.34f, 0.22f, 0.5f), leather, root, world);
            AddPart(PrimitiveType.Cube, "Boot Right", new Vector3(0.2f, 0.12f, 0.12f), new Vector3(0.34f, 0.22f, 0.5f), leather, root, world);

            Transform leftArm = CreateLimb(world, root, "Left Arm", new Vector3(-0.49f, 1.03f, 0.06f), cloth,
                new Vector3(0.24f, 0.4f, 0.25f), new Vector3(0f, -0.03f, 0f));

            Transform rightArm = new GameObject("Right Arm").transform;
            rightArm.SetParent(root, false);
            rightArm.localPosition = new Vector3(0.49f, 1.03f, 0.06f);
            rightArm.localRotation = Quaternion.Euler(0f, 0f, -15f);
            AddPart(PrimitiveType.Capsule, "Right Sleeve", Vector3.zero, new Vector3(0.24f, 0.4f, 0.25f), cloth, rightArm, world);

            locomotion = root.gameObject.AddComponent<ProceduralLocomotion>();
            locomotion.Configure(root, leftLeg, rightLeg, leftArm, rightArm);

            weaponPivot = new GameObject("Weapon Pivot").transform;
            weaponPivot.SetParent(rightArm, false);
            weaponPivot.localPosition = new Vector3(0.03f, -0.38f, 0.03f);
            weaponPivot.localRotation = Quaternion.Euler(0f, 0f, -24f);
            AddPart(PrimitiveType.Cube, "Sword Grip", new Vector3(0f, -0.02f, 0f), new Vector3(0.13f, 0.25f, 0.13f), leather, weaponPivot, world);
            AddPart(PrimitiveType.Cube, "Sword Guard", new Vector3(0f, 0.14f, 0f), new Vector3(0.48f, 0.09f, 0.11f), steel, weaponPivot, world);
            AddPart(PrimitiveType.Cube, "Sword Blade", new Vector3(0f, 0.64f, 0f), new Vector3(0.17f, 0.95f, 0.075f), steel, weaponPivot, world);
            AddPart(PrimitiveType.Cube, "Sword Pommel", new Vector3(0f, -0.19f, 0f), new Vector3(0.17f, 0.12f, 0.16f), armor, weaponPivot, world);

            if (enemy)
            {
                AddPart(PrimitiveType.Cube, "Marauder Hood", new Vector3(0f, 1.99f, 0.02f),
                    new Vector3(0.48f, 0.18f, 0.45f), leather, root, world);
                AddPart(PrimitiveType.Cube, "Marauder Scarf", new Vector3(0f, 1.51f, 0.18f),
                    new Vector3(0.48f, 0.13f, 0.13f), new Color(0.46f, 0.19f, 0.13f), root, world);
            }
            else
            {
                AddPart(PrimitiveType.Cube, "Wayfarer Hood", new Vector3(0f, 1.98f, 0.01f),
                    new Vector3(0.46f, 0.17f, 0.43f), new Color(0.18f, 0.24f, 0.24f), root, world);
                AddPart(PrimitiveType.Cube, "Belt", new Vector3(0f, 0.77f, 0.05f),
                    new Vector3(0.56f, 0.12f, 0.52f), leather, root, world);
            }
        }

        private void AddPart(PrimitiveType primitive, string name, Vector3 localPosition, Vector3 scale,
            Color color, Transform parent, PrototypeWorldBuilder world)
        {
            GameObject part = world.CreatePrimitive(primitive, name, Vector3.zero, scale, color, false, parent);
            part.transform.localPosition = localPosition;
        }

        private Transform CreateLimb(PrototypeWorldBuilder world, Transform parent, string name,
            Vector3 localPosition, Color color, Vector3 meshScale, Vector3 meshOffset)
        {
            Transform pivot = new GameObject(name).transform;
            pivot.SetParent(parent, false);
            pivot.localPosition = localPosition;
            AddPart(PrimitiveType.Capsule, $"{name} Mesh", meshOffset, meshScale, color, pivot, world);
            return pivot;
        }
    }
}
