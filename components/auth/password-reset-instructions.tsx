/**
 * Password Reset Instructions Component
 * 
 * PURPOSE: Provides clear guidance to users about the password reset process
 * - Explains what happens after submitting the form
 * - Sets proper expectations for the reset workflow
 * - Improves user experience with clear next steps
 */
export function PasswordResetInstructions() {
  const instructions = [
    "Check your email inbox (and spam folder)",
    "Click the reset link in the email",
    "Create a new strong password",
  ];

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
        What happens next?
      </h4>
      <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        {instructions.map((instruction, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>{instruction}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
