using System.Linq;
using Fellhaven.Bootstrap;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace Fellhaven.Editor
{
    /// <summary>Creates the starter scene and project defaults once on first import.</summary>
    [InitializeOnLoad]
    public static class PrototypeProjectSetup
    {
        private const string ScenePath = "Assets/Scenes/Prototype.unity";
        private const string SettingsFolder = "Assets/Settings";
        private const string PipelinePath = "Assets/Settings/Fellhaven_URP.asset";

        static PrototypeProjectSetup()
        {
            EditorApplication.delayCall += EnsureProjectSetup;
        }

        [MenuItem("Fellhaven/Setup Prototype Project")]
        public static void EnsureProjectSetup()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            {
                EditorApplication.delayCall += EnsureProjectSetup;
                return;
            }

            EnsureFolders();
            EnsureUrp();
            EnsureInputSystem();
            EnsurePlayerSettings();
            EnsureScene();
        }

        private static void EnsureFolders()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");
            if (!AssetDatabase.IsValidFolder(SettingsFolder))
                AssetDatabase.CreateFolder("Assets", "Settings");
        }

        private static void EnsureUrp()
        {
            UniversalRenderPipelineAsset asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (asset == null)
            {
                asset = UniversalRenderPipelineAsset.Create();
                AssetDatabase.CreateAsset(asset, PipelinePath);
                asset.LoadBuiltinRendererData();
                EditorUtility.SetDirty(asset);
                AssetDatabase.SaveAssets();
            }

            GraphicsSettings.defaultRenderPipeline = asset;
            QualitySettings.renderPipeline = asset;
        }

        private static void EnsureInputSystem()
        {
            PlayerSettings settings = Resources.FindObjectsOfTypeAll<PlayerSettings>().FirstOrDefault();
            if (settings == null)
                return;

            SerializedObject serialized = new SerializedObject(settings);
            SerializedProperty activeInput = serialized.FindProperty("activeInputHandler");
            if (activeInput != null && activeInput.intValue != 2)
            {
                // Keep Input System gameplay actions and legacy IMGUI mouse events available together.
                activeInput.intValue = 2;
                serialized.ApplyModifiedProperties();
            }
        }

        private static void EnsurePlayerSettings()
        {
            PlayerSettings.companyName = "Fellhaven Studio";
            PlayerSettings.productName = "Fellhaven: First Light";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone, "com.fellhaven.firstlight");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.fellhaven.firstlight");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.defaultScreenWidth = 1600;
            PlayerSettings.defaultScreenHeight = 900;
            PlayerSettings.resizableWindow = true;
        }

        private static void EnsureScene()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null)
            {
                Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                GameObject bootstrap = new GameObject("Fellhaven Prototype");
                bootstrap.AddComponent<PrototypeBootstrap>();
                EditorSceneManager.SaveScene(scene, ScenePath);
            }

            EditorBuildSettingsScene[] scenes = EditorBuildSettings.scenes;
            if (!scenes.Any(scene => scene.path == ScenePath && scene.enabled))
            {
                EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) }
                    .Concat(scenes.Where(scene => scene.path != ScenePath))
                    .ToArray();
            }

            AssetDatabase.SaveAssets();
        }
    }
}
