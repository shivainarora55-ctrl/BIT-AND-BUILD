function optionalText(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || undefined;
}

/** Build the Round 2 API body without coupling a project link to a problem statement. */
export function createRoundTwoSubmissionPayload({ projectTitle, description, techStack, repositoryUrl, deployedUrl, status }) {
  return {
    projectTitle: String(projectTitle ?? '').trim(),
    ...(optionalText(description) ? { description: optionalText(description) } : {}),
    ...(optionalText(techStack) ? { techStack: optionalText(techStack) } : {}),
    ...(optionalText(repositoryUrl) ? { repositoryUrl: optionalText(repositoryUrl) } : {}),
    ...(optionalText(deployedUrl) ? { deployedUrl: optionalText(deployedUrl) } : {}),
    status,
  };
}
