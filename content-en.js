(() => {
  const articles = {
    "art-001": {
      titleEn: "AI is not short of tools. What is missing is a way of working with AI",
      excerptEn:
        "The value is not in how many tools we know, but in how AI is integrated into a working system with a clear goal and a way to verify the result.",
    },
    "art-002": {
      titleEn: "How an AI Agent differs from a chatbot or an AI assistant",
      excerptEn:
        "Three levels of AI support — and how to choose the right model for a given group of tasks.",
    },
    "art-003": {
      titleEn: "Where AI should support teachers — and where it should stop",
      excerptEn:
        "A balanced view of usefulness, verification, and the parts of teaching that cannot be replaced.",
    },
    "art-004": {
      titleEn: "Five ways to bring AI into work without making the process heavier",
      excerptEn:
        "Start where the value is clear, the risk is low, and the habit is easy to keep.",
    },
    "art-005": {
      titleEn: "From a good prompt to an AI process you can repeat",
      excerptEn:
        "A prompt is only one part. A process also needs inputs, checkpoints and a standard for the output.",
    },
    "art-006": {
      titleEn: "How people search for information is changing with AI",
      excerptEn:
        "From lists of links to synthesised answers: new opportunities, and new risks, in how we find information.",
    },
    "news-001": {
      titleEn: "VSC Academy updates the August AI Agent workshop schedule",
      excerptEn:
        "New practice sessions for people who want to start building a personal AI Agent.",
    },
    "news-002": {
      titleEn: "Notable shifts in the AI landscape this week",
      excerptEn:
        "A short briefing on technology updates that may affect real work.",
    },
    "news-003": {
      titleEn: "AI in education: from tools to capability",
      excerptEn:
        "A professional exchange on bringing AI into teaching and learning in a structured way.",
    },
  };
  const resources = {
    "res-001": {
      titleEn: "Getting started with applied AI at work",
      excerptEn:
        "A thinking frame to help newcomers choose the right problem and a suitable way to apply AI.",
    },
    "res-002": {
      titleEn: "From isolated tasks to an AI process",
      excerptEn:
        "A step-by-step model for turning AI use into a process you can repeat.",
    },
    "res-003": {
      titleEn: "Building a personal AI Agent",
      excerptEn:
        "An overview of the parts required to build an AI Agent that serves real work.",
    },
    "res-004": {
      titleEn: "Checklist for evaluating an AI problem",
      excerptEn:
        "A short set of questions to decide which problems AI should support or automate.",
    },
    "res-005": {
      titleEn: "AI Workflow design template",
      excerptEn:
        "A structure for describing inputs, processing steps, checkpoints and outputs of a workflow.",
    },
    "res-006": {
      titleEn: "AI in the design of learning activities",
      excerptEn:
        "Practical ways to use AI for content, activities and feedback — with room for verification.",
    },
    "res-007": {
      titleEn: "AI capability in modern work",
      excerptEn:
        "A report on the layers of capability needed when AI becomes part of a working system.",
    },
    "res-008": {
      titleEn: "Principles for verifying AI outputs",
      excerptEn:
        "A practical framework for judging accuracy, fitness and risk in AI-generated work.",
    },
  };
  (window.VSC_ARTICLES || []).forEach((item) => {
    const copy = articles[item.id];
    if (copy) Object.assign(item, copy);
  });
  (window.VSC_RESOURCES || []).forEach((item) => {
    const copy = resources[item.id];
    if (copy) Object.assign(item, copy);
  });
})();
