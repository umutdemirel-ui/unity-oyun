using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Fellhaven.World
{
    public sealed class PrototypeWorldBuilder
    {
        private readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        private readonly Transform root;
        private Light campfireLight;

        public DayNightCycle TimeOfDay { get; private set; }

        public PrototypeWorldBuilder(Transform worldRoot)
        {
            root = worldRoot;
        }

        public void Build()
        {
            ConfigureAtmosphere();
            CreateGround();
            CreateTrail();
            CreateShrine();
            CreateCamp();
            CreateTrees();
            CreateRocks();
            CreateWaterAndRuin();
            CreateSunlight();
        }

        public Material GetMaterial(string name, Color color)
        {
            if (materials.TryGetValue(name, out Material existing))
                return existing;

            Shader shader = GraphicsSettings.currentRenderPipeline != null
                ? Shader.Find("Universal Render Pipeline/Lit")
                : Shader.Find("Standard");
            if (shader == null)
                shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");

            Material material = new Material(shader) { name = name, color = color };
            if (material.HasProperty("_Smoothness"))
                material.SetFloat("_Smoothness", 0.18f);
            materials.Add(name, material);
            return material;
        }

        public GameObject CreatePrimitive(PrimitiveType type, string name, Vector3 position, Vector3 scale,
                                          Color color, bool keepCollider = false, Transform parent = null)
        {
            GameObject item = GameObject.CreatePrimitive(type);
            item.name = name;
            item.transform.SetParent(parent != null ? parent : root, false);
            item.transform.position = position;
            item.transform.localScale = scale;
            Renderer renderer = item.GetComponent<Renderer>();
            renderer.sharedMaterial = GetMaterial($"Mat_{name}_{ColorUtility.ToHtmlStringRGB(color)}", color);

            if (!keepCollider)
            {
                Collider collider = item.GetComponent<Collider>();
                if (collider != null)
                    Object.Destroy(collider);
            }
            return item;
        }

        private void CreateGround()
        {
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Alderwood Clearing";
            ground.transform.SetParent(root, false);
            ground.transform.position = new Vector3(0f, -0.08f, 0f);
            ground.transform.localScale = new Vector3(15f, 1f, 15f);
            Material meadow = GetMaterial("Mat_MossMeadow", new Color(0.82f, 0.86f, 0.76f));
            ApplyPbrMaps(meadow,
                "Fellhaven/FreeAssets/Ground037/Ground037_2K-JPG_Color",
                "Fellhaven/FreeAssets/Ground037/Ground037_2K-JPG_NormalDX",
                52f, 0.22f, 0.45f);
            ground.GetComponent<Renderer>().sharedMaterial = meadow;

            Color hillColor = new Color(0.16f, 0.23f, 0.17f);
            Vector3[] ridges =
            {
                new Vector3(-56f, -1.7f, -25f), new Vector3(-47f, -2.1f, 18f),
                new Vector3(49f, -1.8f, -34f), new Vector3(56f, -1.5f, 21f),
                new Vector3(-11f, -2.6f, 57f), new Vector3(24f, -2.3f, 54f)
            };
            for (int i = 0; i < ridges.Length; i++)
                CreatePrimitive(PrimitiveType.Sphere, $"Distant Ridge {i + 1}", ridges[i], new Vector3(22f, 7f, 15f), hillColor);
        }

        private void CreateTrail()
        {
            Color earth = new Color(0.34f, 0.28f, 0.19f);
            for (int i = 0; i < 11; i++)
            {
                float z = 1.5f + i * 1.55f;
                float x = Mathf.Sin(i * 0.24f) * 1.6f;
                CreatePrimitive(PrimitiveType.Cube, $"Trail Segment {i + 1}", new Vector3(x, -0.005f, z),
                    new Vector3(3.8f, 0.035f, 1.7f), earth);
            }

            Color paleStone = new Color(0.47f, 0.46f, 0.39f);
            for (int i = 0; i < 10; i++)
            {
                float x = (i % 2 == 0 ? -1f : 1f) * (2.3f + (i % 3) * 0.55f);
                float z = 2f + i * 1.65f;
                CreatePrimitive(PrimitiveType.Sphere, $"Trail Stone {i + 1}", new Vector3(x, 0.13f, z),
                    new Vector3(0.32f, 0.22f, 0.42f), paleStone);
            }
        }

        private void CreateShrine()
        {
            Color limestone = new Color(0.51f, 0.49f, 0.41f);
            CreatePrimitive(PrimitiveType.Cylinder, "Wayfarer Shrine Base", new Vector3(0f, 0.18f, -1.6f),
                new Vector3(2.1f, 0.22f, 2.1f), limestone);
            CreatePrimitive(PrimitiveType.Cylinder, "Wayfarer Shrine Plinth", new Vector3(0f, 0.58f, -1.6f),
                new Vector3(1.15f, 0.28f, 1.15f), new Color(0.35f, 0.39f, 0.34f));
            CreatePrimitive(PrimitiveType.Sphere, "Shrine Heart", new Vector3(0f, 1.38f, -1.6f),
                new Vector3(0.56f, 0.7f, 0.56f), new Color(0.42f, 0.72f, 0.61f));

            for (int i = 0; i < 4; i++)
            {
                float angle = i * 90f;
                Vector3 offset = Quaternion.Euler(0f, angle, 0f) * new Vector3(1.2f, 0f, 0f);
                CreatePrimitive(PrimitiveType.Cube, $"Shrine Marker {i + 1}",
                    new Vector3(offset.x, 0.38f, -1.6f + offset.z), new Vector3(0.2f, 0.65f, 0.2f), limestone);
            }
        }

        private void CreateCamp()
        {
            Color canvas = new Color(0.43f, 0.22f, 0.16f);
            GameObject tent = CreatePrimitive(PrimitiveType.Cube, "Marauder Tent", new Vector3(3.8f, 1f, 16.6f),
                new Vector3(3.1f, 1.8f, 3f), canvas);
            tent.transform.rotation = Quaternion.Euler(0f, -10f, 0f);

            Color timber = new Color(0.27f, 0.18f, 0.12f);
            CreatePrimitive(PrimitiveType.Cube, "Camp Crate", new Vector3(6.5f, 0.42f, 15.6f),
                new Vector3(1f, 0.82f, 0.9f), timber);
            CreatePrimitive(PrimitiveType.Cube, "Camp Table", new Vector3(1.9f, 0.62f, 18.1f),
                new Vector3(1.8f, 0.14f, 0.85f), timber);
            CreatePrimitive(PrimitiveType.Cylinder, "Fire Ring", new Vector3(-2.4f, 0.14f, 16.4f),
                new Vector3(1.35f, 0.18f, 1.35f), new Color(0.36f, 0.35f, 0.3f));
            CreatePrimitive(PrimitiveType.Sphere, "Campfire Ember", new Vector3(-2.4f, 0.42f, 16.4f),
                new Vector3(0.52f, 0.66f, 0.52f), new Color(1f, 0.35f, 0.08f));

            GameObject fireLightObject = new GameObject("Campfire Glow");
            fireLightObject.transform.SetParent(root, false);
            fireLightObject.transform.position = new Vector3(-2.4f, 1.2f, 16.4f);
            Light fireLight = fireLightObject.AddComponent<Light>();
            fireLight.type = LightType.Point;
            fireLight.color = new Color(1f, 0.49f, 0.22f);
            fireLight.intensity = 2.2f;
            fireLight.range = 8f;
            campfireLight = fireLight;
        }

        private void CreateTrees()
        {
            Vector3[] positions =
            {
                new Vector3(-9f, 0f, -6f), new Vector3(10f, 0f, -5f), new Vector3(-13f, 0f, 1f),
                new Vector3(13f, 0f, 4f), new Vector3(-10f, 0f, 9f), new Vector3(10f, 0f, 11f),
                new Vector3(-13f, 0f, 19f), new Vector3(14f, 0f, 23f), new Vector3(-8f, 0f, 28f),
                new Vector3(8f, 0f, 30f), new Vector3(-18f, 0f, 29f), new Vector3(19f, 0f, 14f),
                new Vector3(-23f, 0f, 4f), new Vector3(25f, 0f, -7f), new Vector3(-28f, 0f, 17f),
                new Vector3(30f, 0f, 27f), new Vector3(-34f, 0f, 32f), new Vector3(36f, 0f, 4f)
            };

            Color bark = new Color(0.29f, 0.20f, 0.13f);
            Color needles = new Color(0.13f, 0.29f, 0.22f);
            for (int i = 0; i < positions.Length; i++)
            {
                Vector3 position = positions[i];
                float height = 4.3f + (i % 4) * 0.45f;
                CreatePrimitive(PrimitiveType.Cylinder, $"Pine Trunk {i + 1}",
                    position + Vector3.up * (height * 0.35f), new Vector3(0.36f, height * 0.38f, 0.36f), bark);
                CreateCone($"Pine Crown Lower {i + 1}", position + Vector3.up * (height * 0.55f),
                    2.45f, 2.8f, needles);
                CreateCone($"Pine Crown Upper {i + 1}", position + Vector3.up * (height * 0.87f),
                    1.75f, 2.35f, new Color(0.17f, 0.35f, 0.25f));
            }
        }

        private void CreateRocks()
        {
            Color rock = new Color(0.37f, 0.38f, 0.34f);
            Vector3[] positions =
            {
                new Vector3(-5f, 0.28f, 4f), new Vector3(5.4f, 0.35f, 7.2f),
                new Vector3(-6.5f, 0.42f, 13f), new Vector3(8.5f, 0.38f, 19f),
                new Vector3(-8f, 0.5f, 23f), new Vector3(5.2f, 0.42f, 27f),
                new Vector3(11f, 0.32f, 33f), new Vector3(-14f, 0.55f, 34f)
            };
            for (int i = 0; i < positions.Length; i++)
            {
                if (i < 4 && TryCreatePolyHavenBoulder(i, positions[i]))
                    continue;

                GameObject boulder = CreatePrimitive(PrimitiveType.Sphere, $"Boulder {i + 1}", positions[i],
                    new Vector3(1.3f + (i % 3) * 0.4f, 0.8f + (i % 2) * 0.35f, 1.1f), rock, true);
                boulder.transform.rotation = Quaternion.Euler(i * 9f, i * 21f, i * 5f);
            }
        }

        private bool TryCreatePolyHavenBoulder(int index, Vector3 position)
        {
            const string modelPath = "Fellhaven/FreeAssets/Rock09/rock_09_2k";
            GameObject model = Resources.Load<GameObject>(modelPath);
            if (model == null)
                return false;

            Material material = GetMaterial("Mat_PolyHaven_Rock09", Color.white);
            ApplyPbrMaps(material,
                "Fellhaven/FreeAssets/Rock09/textures/rock_09_diff_2k",
                "Fellhaven/FreeAssets/Rock09/textures/rock_09_nor_dx_2k",
                1f, 0.18f, 0.55f);
            material.enableInstancing = true;

            GameObject boulder = Object.Instantiate(model, root);
            boulder.name = $"Poly Haven Rock 09 {index + 1}";
            boulder.transform.position = position;
            boulder.transform.rotation = Quaternion.Euler(index * 9f, index * 21f, index * 5f);

            Renderer[] renderers = boulder.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0)
            {
                Object.Destroy(boulder);
                return false;
            }

            Bounds bounds = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++)
                bounds.Encapsulate(renderers[i].bounds);

            float maxDimension = Mathf.Max(bounds.size.x, bounds.size.y, bounds.size.z);
            float targetSize = 1.45f + (index % 3) * 0.28f;
            if (maxDimension > 0.001f)
                boulder.transform.localScale *= targetSize / maxDimension;

            for (int i = 0; i < renderers.Length; i++)
            {
                Material[] materials = renderers[i].sharedMaterials;
                if (materials.Length == 0)
                {
                    renderers[i].sharedMaterial = material;
                    continue;
                }

                for (int slot = 0; slot < materials.Length; slot++)
                    materials[slot] = material;
                renderers[i].sharedMaterials = materials;
            }

            MeshFilter[] meshes = boulder.GetComponentsInChildren<MeshFilter>(true);
            for (int i = 0; i < meshes.Length; i++)
            {
                if (meshes[i].sharedMesh == null)
                    continue;

                MeshCollider collider = meshes[i].GetComponent<MeshCollider>();
                if (collider == null)
                    collider = meshes[i].gameObject.AddComponent<MeshCollider>();
                collider.sharedMesh = meshes[i].sharedMesh;
            }

            return true;
        }

        private void ApplyPbrMaps(Material material, string colorPath, string normalPath,
            float tiling, float smoothness, float normalScale)
        {
            Texture2D colorMap = Resources.Load<Texture2D>(colorPath);
            Texture2D normalMap = Resources.Load<Texture2D>(normalPath);

            string baseProperty = material.HasProperty("_BaseMap") ? "_BaseMap" : "_MainTex";
            if (colorMap != null && material.HasProperty(baseProperty))
            {
                material.SetTexture(baseProperty, colorMap);
                material.SetTextureScale(baseProperty, Vector2.one * tiling);
                material.color = Color.white;
            }

            if (normalMap != null && material.HasProperty("_BumpMap"))
            {
                material.SetTexture("_BumpMap", normalMap);
                material.SetTextureScale("_BumpMap", Vector2.one * tiling);
                if (material.HasProperty("_BumpScale"))
                    material.SetFloat("_BumpScale", normalScale);
                material.EnableKeyword("_NORMALMAP");
            }

            if (material.HasProperty("_Smoothness"))
                material.SetFloat("_Smoothness", smoothness);
        }

        private void CreateWaterAndRuin()
        {
            CreatePrimitive(PrimitiveType.Cube, "Shallow Stream", new Vector3(25f, -0.02f, 21f),
                new Vector3(18f, 0.04f, 3.6f), new Color(0.14f, 0.34f, 0.4f));

            Color oldStone = new Color(0.43f, 0.43f, 0.37f);
            Vector3 ruinOrigin = new Vector3(-18f, 0f, 28f);
            CreatePrimitive(PrimitiveType.Cube, "Ruined Wall Left", ruinOrigin + new Vector3(-1.4f, 1.5f, 0f),
                new Vector3(1.15f, 3f, 0.65f), oldStone, true);
            CreatePrimitive(PrimitiveType.Cube, "Ruined Wall Center", ruinOrigin + new Vector3(0.2f, 2.7f, 0f),
                new Vector3(2.4f, 0.6f, 0.65f), oldStone, true);
            CreatePrimitive(PrimitiveType.Cube, "Ruined Wall Right", ruinOrigin + new Vector3(1.8f, 1.05f, 0f),
                new Vector3(0.7f, 2.1f, 0.65f), oldStone, true);
            CreatePrimitive(PrimitiveType.Cube, "Fallen Stone", ruinOrigin + new Vector3(1.25f, 0.22f, 1f),
                new Vector3(2.4f, 0.38f, 0.6f), oldStone, true).transform.rotation = Quaternion.Euler(0f, 0f, -12f);
        }

        private void CreateSunlight()
        {
            GameObject lightObject = new GameObject("Dawn Sun");
            lightObject.transform.SetParent(root, false);
            lightObject.transform.rotation = Quaternion.Euler(38f, -28f, 0f);
            Light sunlight = lightObject.AddComponent<Light>();
            sunlight.type = LightType.Directional;
            sunlight.color = new Color(1f, 0.84f, 0.66f);
            sunlight.intensity = 1.25f;
            sunlight.shadows = LightShadows.Soft;

            TimeOfDay = lightObject.AddComponent<DayNightCycle>();
            TimeOfDay.Configure(sunlight, campfireLight);
        }

        private void ConfigureAtmosphere()
        {
            RenderSettings.ambientLight = new Color(0.48f, 0.55f, 0.51f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.34f, 0.43f, 0.39f);
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 38f;
            RenderSettings.fogEndDistance = 105f;
        }

        private void CreateCone(string name, Vector3 position, float radius, float height, Color color)
        {
            const int segments = 9;
            Vector3[] vertices = new Vector3[segments + 2];
            int[] triangles = new int[segments * 6];
            vertices[0] = Vector3.zero;
            vertices[1] = Vector3.up * height;
            for (int i = 0; i < segments; i++)
            {
                float angle = Mathf.PI * 2f * i / segments;
                vertices[i + 2] = new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);
                int t = i * 6;
                int current = i + 2;
                int next = ((i + 1) % segments) + 2;
                triangles[t] = 1;
                triangles[t + 1] = next;
                triangles[t + 2] = current;
                triangles[t + 3] = 0;
                triangles[t + 4] = current;
                triangles[t + 5] = next;
            }

            Mesh mesh = new Mesh { name = $"{name} Mesh" };
            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.RecalculateNormals();
            GameObject cone = new GameObject(name);
            cone.transform.SetParent(root, false);
            cone.transform.position = position;
            MeshFilter filter = cone.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            MeshRenderer renderer = cone.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = GetMaterial($"Mat_{name}", color);
        }
    }
}
