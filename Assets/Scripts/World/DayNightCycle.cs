using UnityEngine;

namespace Fellhaven.World
{
    /// <summary>Drives a lightweight world clock and lighting pass for the prototype scene.</summary>
    public sealed class DayNightCycle : MonoBehaviour
    {
        private const float HoursPerDay = 24f;

        private Light sun;
        private Light campfire;
        private float cycleDurationSeconds = 360f;
        private float hourOfDay = 8f;
        private int dayNumber = 1;

        public string ClockLabel
        {
            get
            {
                int hour = Mathf.FloorToInt(hourOfDay);
                int minute = Mathf.FloorToInt((hourOfDay - hour) * 60f);
                return $"DAY {dayNumber:00}  {hour:00}:{minute:00}";
            }
        }

        public string PhaseLabel
        {
            get
            {
                if (hourOfDay >= 20f || hourOfDay < 5f)
                    return "NIGHT";
                if (hourOfDay < 7f)
                    return "DAWN";
                if (hourOfDay < 17f)
                    return "DAY";
                return "DUSK";
            }
        }

        public void Configure(Light directionalSun, Light campfireLight, float initialHour = 8f,
            float fullDayDurationSeconds = 360f)
        {
            sun = directionalSun;
            campfire = campfireLight;
            hourOfDay = Mathf.Repeat(initialHour, HoursPerDay);
            cycleDurationSeconds = Mathf.Max(60f, fullDayDurationSeconds);
            dayNumber = 1;
            ApplyLighting();
        }

        private void Update()
        {
            if (sun == null)
                return;

            float nextHour = hourOfDay + Time.deltaTime * HoursPerDay / cycleDurationSeconds;
            if (nextHour >= HoursPerDay)
            {
                dayNumber += Mathf.FloorToInt(nextHour / HoursPerDay);
                nextHour = Mathf.Repeat(nextHour, HoursPerDay);
            }

            hourOfDay = nextHour;
            ApplyLighting();
        }

        private void ApplyLighting()
        {
            if (sun == null)
                return;

            sun.transform.rotation = Quaternion.Euler(hourOfDay * 15f - 90f, -28f, 0f);

            float solarHeight = Mathf.Sin((hourOfDay - 6f) / 12f * Mathf.PI);
            float daylight = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01((solarHeight + 0.2f) / 0.42f));
            float goldenHour = Mathf.Clamp01(1f - Mathf.Min(Mathf.Abs(hourOfDay - 7f),
                Mathf.Abs(hourOfDay - 18f)) / 3.5f) * daylight;

            Color nightTint = new Color(0.2f, 0.29f, 0.48f);
            Color dayTint = new Color(1f, 0.94f, 0.82f);
            Color warmTint = new Color(1f, 0.63f, 0.39f);
            sun.color = Color.Lerp(Color.Lerp(nightTint, dayTint, daylight), warmTint, goldenHour * 0.72f);
            sun.intensity = Mathf.Lerp(0.045f, 1.25f, daylight);
            sun.shadowStrength = Mathf.Lerp(0.18f, 0.82f, daylight);

            RenderSettings.ambientLight = Color.Lerp(
                new Color(0.075f, 0.095f, 0.16f), new Color(0.48f, 0.55f, 0.51f), daylight);
            RenderSettings.fogColor = Color.Lerp(
                new Color(0.055f, 0.075f, 0.13f), new Color(0.34f, 0.43f, 0.39f), daylight);

            if (campfire != null)
                campfire.intensity = Mathf.Lerp(2.2f, 0.65f, daylight);
        }
    }
}
