using UnityEngine;

namespace Fellhaven.Player
{
    /// <summary>Small placeholder gait so the greybox actors move with a readable rhythm.</summary>
    public sealed class ProceduralLocomotion : MonoBehaviour
    {
        private Transform body;
        private Transform leftLeg;
        private Transform rightLeg;
        private Transform leftArm;
        private Transform rightArm;
        private Vector3 bodyRestPosition;
        private float movementAmount;
        private bool sprinting;
        private bool attacking;
        private float phase;

        public void Configure(Transform bodyRoot, Transform leftLegPivot, Transform rightLegPivot,
                              Transform leftArmPivot, Transform rightArmPivot)
        {
            body = bodyRoot;
            leftLeg = leftLegPivot;
            rightLeg = rightLegPivot;
            leftArm = leftArmPivot;
            rightArm = rightArmPivot;
            bodyRestPosition = body.localPosition;
        }

        public void SetMovement(float amount, bool isSprinting = false)
        {
            movementAmount = Mathf.Clamp01(amount);
            sprinting = isSprinting;
        }

        public void SetAttacking(bool value)
        {
            attacking = value;
        }

        private void Update()
        {
            float gaitSpeed = sprinting ? 13f : 8.5f;
            phase += Time.deltaTime * gaitSpeed;
            float stride = Mathf.Sin(phase) * movementAmount;

            if (leftLeg != null)
                leftLeg.localRotation = Quaternion.Euler(stride * 28f, 0f, 0f);
            if (rightLeg != null)
                rightLeg.localRotation = Quaternion.Euler(-stride * 28f, 0f, 0f);
            if (leftArm != null)
                leftArm.localRotation = Quaternion.Euler(-stride * 17f, 0f, -8f);
            if (rightArm != null && !attacking)
                rightArm.localRotation = Quaternion.Euler(stride * 10f, 0f, -15f);

            if (body != null)
            {
                body.localPosition = bodyRestPosition + Vector3.up * (Mathf.Abs(stride) * 0.045f);
                body.localRotation = Quaternion.Euler(0f, 0f, -movementAmount * 3f);
            }
        }
    }
}
