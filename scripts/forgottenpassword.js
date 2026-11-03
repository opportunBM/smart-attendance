const form = document.getElementById("forgot-password-form");
const emailInput = document.getElementById("forgot-email");
const submitButton = document.getElementById("forgot-password-button");
const messageElement = document.getElementById("forgot-password-message");

function showForgotMessage(message, type) {
  messageElement.textContent = message;
  messageElement.className = `text-xs font-semibold text-center ${
    type === "error" ? "text-red-400" : "text-emerald-400"
  }`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  if (!email) return;

  submitButton.disabled = true;
  submitButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Traitement...';
  messageElement.className = "hidden";

  try {
    const { data: user, error: userError } = await _supabase
      .from("utilisateurs")
      .select("id, nom, postnom, prenom, email")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      showForgotMessage(
        "Aucun compte ne correspond à cette adresse e-mail.",
        "error",
      );
      return;
    }

    const newPassword = String(Math.floor(1000 + Math.random() * 9000));
    const { error: updateError } = await _supabase
      .from("utilisateurs")
      .update({ mot_de_passe: newPassword })
      .eq("id", user.id);

    if (updateError) throw updateError;

    try {
      await sendSecurityEmail({
        toEmail: user.email,
        toName:
          `${user.prenom || ""} ${user.nom || ""} ${user.postnom || ""}`.trim(),
        subject: "Réinitialisation de votre mot de passe Smart Attendance",
        message:
          "Votre mot de passe a été réinitialisé. Utilisez le code ci-dessous pour vous connecter, puis modifiez-le depuis votre profil.",
        code: newPassword,
        expiresAt: "après votre prochaine connexion",
      });
    } catch (emailError) {
      console.error(
        "Mot de passe réinitialisé, mais e-mail non envoyé :",
        emailError,
      );
      showForgotMessage(
        "Le mot de passe a été réinitialisé, mais l’e-mail n’a pas pu être envoyé. Contactez l’administration.",
        "error",
      );
      return;
    }

    showForgotMessage(
      "Votre mot de passe a bien été réinitialisé. Rendez-vous dans vos mails pour voir votre nouveau mot de passe, vous pourrez le modifier une fois connecté.",
      "success",
    );
    form.reset();
  } catch (error) {
    console.error("Erreur réinitialisation mot de passe :", error);
    showForgotMessage(
      "Impossible de réinitialiser le mot de passe pour le moment.",
      "error",
    );
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML =
      '<i class="fa-solid fa-key mr-2"></i>Réinitialiser';
  }
});
