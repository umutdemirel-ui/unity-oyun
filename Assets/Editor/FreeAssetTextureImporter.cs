using System;
using UnityEditor;
using UnityEngine;

namespace Fellhaven.Editor
{
    /// <summary>Applies mobile-friendly, linear import settings to the bundled CC0 PBR maps.</summary>
    [InitializeOnLoad]
    internal static class FreeAssetTextureImporter
    {
        internal const string AssetRoot = "Assets/Resources/Fellhaven/FreeAssets";

        static FreeAssetTextureImporter()
        {
            EditorApplication.delayCall += ConfigureExistingTextures;
        }

        internal static void Configure(string path, TextureImporter importer)
        {
            bool isNormal = path.IndexOf("NormalDX", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            path.IndexOf("nor_dx", StringComparison.OrdinalIgnoreCase) >= 0;
            bool isLinear = isNormal ||
                            path.IndexOf("Roughness", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            path.IndexOf("AmbientOcclusion", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            path.IndexOf("_rough_", StringComparison.OrdinalIgnoreCase) >= 0;

            importer.textureType = isNormal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            importer.sRGBTexture = !isLinear;
            importer.maxTextureSize = 2048;
            importer.mipmapEnabled = true;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
        }

        private static void ConfigureExistingTextures()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            {
                EditorApplication.delayCall += ConfigureExistingTextures;
                return;
            }

            string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { AssetRoot });
            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null)
                    continue;

                bool isNormal = path.IndexOf("NormalDX", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                path.IndexOf("nor_dx", StringComparison.OrdinalIgnoreCase) >= 0;
                bool isLinear = isNormal ||
                                path.IndexOf("Roughness", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                path.IndexOf("AmbientOcclusion", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                path.IndexOf("_rough_", StringComparison.OrdinalIgnoreCase) >= 0;
                TextureImporterType expectedType = isNormal ? TextureImporterType.NormalMap : TextureImporterType.Default;
                bool expectedSrgb = !isLinear;
                bool changed = importer.textureType != expectedType || importer.sRGBTexture != expectedSrgb ||
                               importer.maxTextureSize != 2048 || !importer.mipmapEnabled ||
                               importer.textureCompression != TextureImporterCompression.CompressedHQ;
                if (!changed)
                    continue;

                Configure(path, importer);
                importer.SaveAndReimport();
                Debug.Log($"Fellhaven free asset import settings applied: {path}");
            }
        }
    }

    internal sealed class FreeAssetTexturePostprocessor : AssetPostprocessor
    {
        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(FreeAssetTextureImporter.AssetRoot + "/", StringComparison.OrdinalIgnoreCase))
                return;

            FreeAssetTextureImporter.Configure(assetPath, (TextureImporter)assetImporter);
        }
    }
}
