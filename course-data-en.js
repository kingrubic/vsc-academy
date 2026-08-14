(() => {
  const starter = window.VSC_PROGRAMS.find((p) => p.id === "ai-starter");
  const foundation = window.VSC_PROGRAMS.find((p) => p.id === "ai-foundation");
  const agent = window.VSC_PROGRAMS.find((p) => p.id === "ai-agent-automation");
  const info = window.VSC_PROGRAM_INFO || {};

  Object.assign(starter, {
    ...info["ai-starter"],
    name: "AI STARTER",
    shortName: "AI Starter",
    level: "BEGINNER",
    subtitle: "APPLIED AI EXPERIENCE",
    heroHeadline: "START WITH AI\nTHROUGH A REAL-WORLD PROBLEM",
    tagline: "A CLEAR, PRACTICAL AND GUIDED FIRST EXPERIENCE",
    description:
      "A practical introduction to thinking, communicating and working with AI through a focused real-world task — rather than beginning with a catalogue of tools and terms.",
    heroMeta: [
      "Beginner",
      info["ai-starter"]?.formatLabel,
      info["ai-starter"]?.durationLabel,
      `Total ${info["ai-starter"]?.totalDuration}`,
    ].filter(Boolean),
    heroOutcomes: [
      "See what AI can and cannot support",
      "Describe a real problem clearly to AI",
      "Complete one applied AI task",
      "Identify a useful next step in your AI learning",
    ],
    heroNote:
      "A good starting point if you are new to AI, or want to experience how VSC Academy approaches applied AI.",
    courseSummary: {
      label: "Introductory course · Applied AI experience",
      note: "Designed for beginners, or for anyone who wants a clearer way to start working with AI.",
    },
    audience: [
      {
        title: "YOU ARE NOT SURE WHERE TO START",
        description:
          "You are new to AI and want a simple, understandable first step.",
      },
      {
        title: "YOU HAVE TRIED AI, BUT WITHOUT A CLEAR METHOD",
        description:
          "You have used AI for a few tasks, but the results still feel inconsistent and hard to improve.",
      },
      {
        title: "YOU WANT TO LEARN THROUGH A REAL PROBLEM",
        description:
          "You would rather work through a real task than begin with theory or a list of tools.",
      },
      {
        title: "YOU WANT TO KNOW WHAT COMES NEXT",
        description:
          "You want a clearer sense of where AI can help — and which learning path to take afterwards.",
      },
    ],
    outcomes: [
      {
        title: "UNDERSTAND THE ROLE OF AI",
        description:
          "Recognise where AI can help, where it reaches its limits, and when human review is required.",
      },
      {
        title: "FRAME A PROBLEM FOR AI",
        description:
          "Turn a real need into a clear request so AI can work with the right context and goal.",
      },
      {
        title: "PRACTICE A BASIC WORKING PROCESS WITH AI",
        description:
          "Move from defining the problem to working with AI, checking the result and adjusting it.",
      },
      {
        title: "COMPLETE A REAL-WORLD APPLIED AI TASK",
        description:
          "Leave with a result you can continue using after the program.",
      },
    ],
    outcomeClosing: {
      label: "AND MORE IMPORTANTLY",
      lead: "You will know where you stand in your AI journey and ",
      highlight: "which direction is worth pursuing next.",
    },
    curriculumOutcomeLabel: "RESULT",
    curriculum: [
      {
        title: "UNDERSTAND",
        goal: "Place AI in the right role",
        content:
          "See what AI can support, where it is limited, and how it can help with a specific problem.",
        output: "A clearly defined problem worth working on with AI.",
      },
      {
        title: "COMMUNICATE",
        goal: "Turn a need into a clear request for AI",
        content:
          "Learn to provide context, goals and requirements so AI can address the right problem.",
        output: "A complete request / prompt for your own task.",
      },
      {
        title: "PRACTICE",
        goal: "Work with AI through a process",
        content:
          "Practice defining the problem, reviewing the output, adjusting it and developing the result.",
        output: "A basic working process with AI.",
      },
      {
        title: "VERIFY",
        goal: "Assess and complete the result",
        content:
          "Check, challenge and refine the output before putting it to use.",
        output: "A completed real-world applied AI task.",
      },
    ],
    outputs: ["A COMPLETED REAL-WORLD APPLIED AI TASK"],
    outputDescription:
      "Built and reviewed directly during the program, based on a problem that matters to you.",
    ctaLabel: "START WITH AI",
    faq: [
      {
        q: "Can I join if I am new to AI?",
        a: "Yes. AI Starter is designed for beginners, and for people who have tried AI without a clear method. The program starts from a real problem rather than from terminology or tools.",
      },
      {
        q: "Do I need programming experience?",
        a: "No. The focus is on how you think, communicate and work with AI. No programming background is required.",
      },
      {
        q: "What should I prepare?",
        a: "A laptop, a stable internet connection, and access to Google Meet. Any additional requirements will be shared by VSC Academy before class.",
      },
      {
        q: "I have already used AI. Is AI Starter still useful?",
        a: "Yes, if you are using AI task by task without a clear method, or if you want to experience VSC Academy’s applied approach before going further.",
      },
      {
        q: "How is the program delivered?",
        a: "AI Starter runs as two live online sessions of 120 minutes each. You are guided, you practice, and you review your result during class.",
      },
      {
        q: "What will I leave with?",
        a: "A completed real-world applied AI task, a basic way of working with AI, and a clearer next step for developing your AI capability.",
      },
    ],
    seo: {
      title: "AI Starter | Start with AI through a real-world problem | VSC Academy",
      description:
        "A practical introduction to thinking, communicating and working with AI through one focused real-world task at VSC Academy.",
    },
    pageChrome: {
      audienceEyebrow: "WHO THIS PROGRAM IS FOR",
      audienceTitle: "AI STARTER IS A FIT IF...",
      outcomeEyebrow: "LEARNING OUTCOMES",
      outcomeTitle: "AFTER THE PROGRAM, YOU WILL BE ABLE TO...",
      curriculumEyebrow: "CURRICULUM",
      curriculumTitle: "A PATH FROM UNDERSTANDING<br>TO DOING",
      curriculumIntro: "2 SESSIONS · 4 LEARNING STAGES",
      outputEyebrow: "REAL OUTPUTS",
      outputTitle: "YOU DON'T JUST LEARN<br>YOU COMPLETE A REAL-WORLD AI TASK",
      outputDescription:
        "During the program, you choose a real problem, work with AI, review the result and refine an approach that fits your own need.",
      outputClosing:
        "The output is not a sample exercise. It is an applied result built around your own problem.",
      blueprintLabel: "OUTPUT CANVAS · AI STARTER",
      blueprintTitle: "YOUR APPLIED AI TASK",
      blueprintResult: "A COMPLETED APPLIED AI TASK",
      methodEyebrow: "THE VSC METHOD",
      methodTitle: "FROM UNDERSTANDING TO DOING",
      methodDescription:
        "Each part of the program is designed to move quickly from understanding into trying, building and verifying on a real problem.",
      scheduleEyebrow: "UPCOMING CLASSES",
      scheduleTitle: "CHOOSE A CLASS THAT FITS YOUR SCHEDULE",
      scheduleIntro:
        "Upcoming AI Starter classes are updated directly from the VSC Academy schedule.",
      scheduleLink: "View full schedule →",
      faqEyebrow: "FAQ",
      faqTitle: "QUESTIONS YOU MAY<br>HAVE BEFORE STARTING",
      faqIntro: "A few things worth knowing before you begin with AI Starter.",
      faqContact: "Still have a question? Contact VSC Academy →",
      finalEyebrow: "READY TO BEGIN?",
      finalTitle: "START YOUR AI JOURNEY<br>WITH A REAL-WORLD PROBLEM",
      finalDescription:
        "AI Starter is a first step toward understanding AI, working with it directly, and choosing a useful next step.",
      instructorEyebrow: "INSTRUCTORS",
      instructorTitle: "THE PEOPLE WHO GUIDE THE PROGRAM",
    },
  });

  Object.assign(foundation, {
    ...info["ai-foundation"],
    name: "APPLIED AI FOR WORK",
    shortName: "Applied AI for Work",
    level: "FOUNDATION",
    heroHeadline: "BRING AI\nINTO THE WAY YOU WORK",
    tagline: "FROM USING AI → TO WORKING WITH AI",
    description:
      "Build the mindset, skills and workflows needed to make AI a practical part of your everyday work — not only a tool you turn to for isolated tasks.",
    heroMeta: [
      "Foundation",
      info["ai-foundation"]?.formatLabel,
      info["ai-foundation"]?.durationLabel,
      `Total ${info["ai-foundation"]?.totalDuration}`,
    ].filter(Boolean),
    heroOutcomes: [
      "Identify the right problems for AI",
      "Design an AI workflow around real work",
      "Build a personal working system with AI support",
      "Apply AI to research, information work and content",
    ],
    infoCard: true,
    audience: [
      {
        title: "YOU HAVE USED AI, BUT THE RESULTS ARE UNEVEN",
        description:
          "You have tried several times, yet the quality still depends on how you ask and on each situation.",
      },
      {
        title: "YOU USE AI FOR SEPARATE TASKS",
        description:
          "You want to move from asking as you go to a more consistent way of working.",
      },
      {
        title: "YOU SPEND TOO MUCH TIME PROCESSING INFORMATION",
        description:
          "Research, synthesis, analysis or content is a regular part of your work.",
      },
      {
        title: "YOU WANT A WORKFLOW WITH AI SUPPORT",
        description:
          "You want AI to become part of your daily process, not a tool you remember only now and then.",
      },
    ],
    outcomes: [
      {
        title: "CHOOSE THE RIGHT PROBLEM",
        description:
          "Know which work is suitable for AI — and which work should stay with you.",
      },
      {
        title: "BRIEF AI CLEARLY",
        description:
          "Provide context, requirements and criteria so AI can take on the task correctly.",
      },
      {
        title: "APPLY AI TO REAL WORK",
        description:
          "Use AI for research, information work, synthesis and content in your own context.",
      },
      {
        title: "BUILD A PERSONAL WORKFLOW",
        description:
          "Design a working process with AI support that you can keep using.",
      },
      {
        title: "KNOW THE NEXT STEP",
        description:
          "See whether to go deeper in application, toward Automation, or toward an AI Agent.",
      },
    ],
    curriculumOutcomeLabel: "RESULT",
    curriculum: [
      {
        title: "UNDERSTAND",
        goal: "Place AI in the right role at work.",
        content:
          "See what AI can support, where it is limited, and which kinds of work it fits.",
        output: "A clearer view of which tasks to give to AI.",
      },
      {
        title: "DESCRIBE",
        goal: "Turn work into a clear request for AI.",
        content:
          "Define context, goal, inputs and output criteria for a specific task.",
        output: "A clear brief or prompt for AI.",
      },
      {
        title: "APPLY",
        goal: "Use AI on a real work problem.",
        content:
          "Use AI to research, process information, synthesise or create content for a concrete task.",
        output: "A completed applied AI task from your own work.",
      },
      {
        title: "BUILD WORKFLOWS",
        goal: "Design a personal workflow with AI support.",
        content:
          "Connect several working steps into a simple process you can repeat.",
        output: "A personal AI workflow.",
      },
      {
        title: "VERIFY",
        goal: "Review, improve and choose a next step.",
        content:
          "Check output quality, take feedback and improve how you work with AI.",
        output: "A first workflow you can keep developing.",
      },
    ],
    outputs: [
      {
        title: "A PERSONAL AI WORKFLOW",
        description:
          "A basic working process with AI support, built from one of your own tasks.",
      },
      {
        title: "A WORK PROBLEM YOU HAVE PRACTICED",
        description:
          "Direct application of AI to a task such as research, information work, synthesis or content.",
      },
      {
        title: "A MAP FOR WHAT COMES NEXT",
        description:
          "A clearer view of which work to keep applying AI to — and when to move toward Automation or an AI Agent.",
      },
    ],
    method: {
      headline: "UNDERSTAND → APPLY → BUILD WORKFLOWS → VERIFY",
      description:
        "You are not only shown how to use AI. You bring it into a real work problem, build a way of working, and review the result.",
      items: [
        ["20%", "FOUNDATIONS", "Understand first, then apply."],
        ["30%", "GUIDANCE & ANALYSIS", "See how the work is framed and carried out."],
        ["40%", "PRACTICE & WORKFLOW", "Work directly on your own tasks."],
        ["10%", "FEEDBACK & REFINEMENT", "Review, adjust and complete."],
      ],
    },
    final: {
      headline: "BRING AI INTO YOUR WORK<br>IN A MORE SYSTEMATIC WAY",
      description:
        "Start from a real problem, build a way of working with AI, and form a workflow that fits the work you actually do.",
      micro: "LIVE ONLINE · 2 SESSIONS × 120 MINUTES · 999.000Đ",
      cta: "REGISTER FOR THIS COURSE",
    },
    faq: [
      {
        q: "Who is this program for?",
        a: "It is a good fit if you have started using AI, or want a more structured way to bring it into your work. It is especially relevant for office professionals, marketers, educators, managers, business owners and anyone whose work involves research, information or content.",
      },
      {
        q: "Can I join if I have not used AI much?",
        a: "Yes. You do not need to be fluent with AI before you start. The program begins with choosing the right problem, briefing AI clearly, and building a more systematic way of working.",
      },
      {
        q: "Do I need many AI tools, or programming experience?",
        a: "No. The course is not a survey of tools, and it does not require programming. The focus is on thinking, briefing, verifying and building a workflow with AI support.",
      },
      {
        q: "What kinds of work will I apply AI to?",
        a: "That depends on your role. Typical applications include research, finding and synthesising information, analysis, drafting, content, document standardisation and organising a personal working process.",
      },
      {
        q: "What will I leave with?",
        a: "A basic personal AI workflow, a work problem you have practiced with AI, and a clearer sense of which tasks to develop further with AI, Automation or an AI Agent.",
      },
      {
        q: "What should I take after this program?",
        a: "If you already have a foundation for working with AI and want to go further into automation, advanced workflows or AI Agents, the next program is AI Agent & Automation.",
      },
    ],
    ctaHref: null,
    ctaLabel: "REGISTER FOR THIS COURSE",
    seo: {
      title: "Applied AI for Work | VSC Academy",
      description:
        "Move from using AI in isolated tasks to building workflows and a working system with AI, through a practical applied method.",
    },
    pageChrome: {
      audienceEyebrow: "WHO THIS PROGRAM IS FOR",
      audienceTitle: "THESE ARE SITUATIONS<br>YOU MAY RECOGNISE",
      outcomeEyebrow: "LEARNING OUTCOMES",
      outcomeTitle: "WHAT YOU WILL BE ABLE TO DO",
      curriculumEyebrow: "CURRICULUM",
      curriculumTitle: "A PATH BUILT<br>AROUND CAPABILITY",
      outputTitle: "LEAVE WITH OUTPUTS<br>YOU CAN KEEP USING",
      outputDescription:
        "You do not only learn how to use AI. You build and test outputs connected to your own work.",
      outputClosing: "",
      scheduleTitle: "CHOOSE A CLASS THAT FITS",
      scheduleIntro:
        "Upcoming Applied AI for Work classes are updated directly from the VSC Academy schedule.",
      faqTitle: "QUESTIONS ABOUT<br>THE PROGRAM",
      faqIntro:
        "A few things worth knowing before you begin Applied AI for Work.",
    },
  });

  Object.assign(agent, {
    ...info["ai-agent-automation"],
    name: "AI AGENT & AUTOMATION",
    shortName: "AI Agent & Automation",
    level: "ADVANCED",
    subtitle: "BUILDING AI SYSTEMS",
    heroHeadline: "FROM WORKING WITH AI\nTO BUILDING AI SYSTEMS\nFOR YOUR WORK",
    tagline: "ANALYZE → DESIGN → BUILD → AUTOMATE → VERIFY",
    description:
      "Learn to analyse a work process, design a workflow, build an AI Agent and gradually automate the tasks that fit the way you actually work.",
    heroMeta: [
      "Advanced",
      info["ai-agent-automation"]?.formatLabel,
      {
        label: info["ai-agent-automation"]?.practiceBadge,
        featured: true,
      },
    ].filter(Boolean),
    heroOutcomes: [
      "Analyse work and identify tasks suited to an AI Agent",
      "Set up and personalise an AI Agent for your own context",
      "Design workflows and skills for the Agent",
      "Test, refine and gradually automate the system",
    ],
    heroNote:
      "You set up, personalise and review an AI Agent in the context of your own work.",
    audience: [
      {
        title: "YOU ALREADY USE AI REGULARLY",
        description:
          "You are used to working with AI and want to go beyond question-and-answer or one-off tasks.",
      },
      {
        title: "YOU WANT TO REDUCE REPETITIVE WORK",
        description:
          "You want repeated actions to become a workflow that can run more consistently.",
      },
      {
        title: "YOU WANT TO BUILD AN AI AGENT FOR YOUR WORK",
        description:
          "You want an Agent that can support a group of tasks, not only reply to each request.",
      },
      {
        title: "YOU WANT AI PERSONALISED TO HOW YOU WORK",
        description:
          "You want the Agent to understand your context, data, process and working style.",
      },
    ],
    audienceClosing: {
      label: "YOUR NEXT STEP",
      lead: "FROM USING AI → TO BECOMING ",
      highlight: "SOMEONE WHO BUILDS AI SYSTEMS",
      tail: " FOR WORK.",
    },
    outcomeProgress: [
      "ANALYZE",
      "DESIGN",
      "BUILD THE AGENT",
      "PERSONALISE",
      "AUTOMATE",
      "REFINE",
    ],
    outcomes: [
      {
        title: "ANALYSE A WORK PROCESS",
        description:
          "Identify the steps AI can support, automate, or hand to an Agent.",
      },
      {
        title: "DESIGN AN AI WORKFLOW",
        description:
          "Turn a work process into a workflow with clear inputs, tasks, logic and outputs.",
      },
      {
        title: "BUILD A PRACTICAL AI AGENT WITH HERMES",
        description:
          "Set up, configure and build a working AI Agent on Hermes for a specific group of tasks.",
        featured: true,
        label: "PRACTICE FOCUS",
      },
      {
        title: "PERSONALISE THE AGENT TO YOUR WORK",
        description:
          "Set context, knowledge, skills and operating rules that match the way you work.",
      },
      {
        title: "CONNECT WORKFLOW AND AUTOMATION",
        description:
          "Gradually reduce repeated actions by connecting the Agent to a workflow and suitable automated steps.",
      },
      {
        title: "TEST AND REFINE THE SYSTEM",
        description:
          "Review output quality, adjust the logic and improve the Agent after use.",
      },
    ],
    curriculumOutcomeLabel: "RESULT",
    curriculum: [
      {
        title: "ANALYZE",
        goal: "Identify the work that can be handed to AI",
        content:
          "Break down the process, find repeated work, map inputs and outputs, and mark where a person still needs to stay in control.",
        output: "A map of opportunities for AI and automation.",
      },
      {
        title: "DESIGN",
        goal: "Design the architecture of the workflow and AI Agent",
        content:
          "Define the Agent’s tasks, processing flow, required data, decision logic and points of human interaction.",
        output: "A workflow and Agent blueprint.",
      },
      {
        title: "BUILD",
        goal: "Set up and personalise an AI Agent with Hermes",
        content:
          "Configure a Hermes Agent with context, knowledge, skills and guidance so it can work in your own setting.",
        output: "A personalised Hermes Agent.",
        featured: true,
        label: "PRACTICE FOCUS",
      },
      {
        title: "AUTOMATE",
        goal: "Connect the Agent to a workflow and automatable steps",
        content:
          "Build a processing chain that reduces manual work and makes the process easier to repeat.",
        output: "A workflow with the Agent taking part in the work.",
      },
      {
        title: "VERIFY",
        goal: "Assess how the system operates",
        content:
          "Test inputs and outputs, find errors, adjust logic, refine the Agent and define where human control remains necessary.",
        output:
          "A completed Agent / Workflow you can keep using and developing.",
        progressLabel: "VERIFY",
      },
    ],
    outputs: ["A PERSONALISED AI AGENT / AI WORKFLOW"],
    outputDescription:
      "Built for a specific problem from your own work, and ready to keep testing and improving after the program.",
    final: {
      headline: "BUILD AN AI AGENT<br>FOR YOUR OWN WORK",
      description:
        "Starting from a real problem, you analyse the process, build and personalise an AI Agent with Hermes, then test it so it can keep developing in your work.",
      cta: "REGISTER FOR AI AGENT & AUTOMATION",
      practiceNote: "Hands-on practice with Hermes",
    },
    faq: [
      {
        q: "What background do I need?",
        a: "This program is for people who already use AI at work and want to move from one-off tasks to building a workflow or an AI Agent. You do not need to be an AI specialist, but you should have a real process or group of tasks you want to analyse and improve.",
      },
      {
        q: "Do I need programming experience?",
        a: "No. Programming is not required. The focus is on analysing work, designing a workflow, configuring an Agent and reviewing how the system operates. Technical steps are guided during practice.",
      },
      {
        q: "Will I actually build an AI Agent?",
        a: "Yes. You will set up, configure and personalise an AI Agent on Hermes around a specific group of tasks or a real work problem.",
      },
      {
        q: "How is the AI Agent personalised?",
        a: "The Agent is built around your work context: goals, working style, guidance, knowledge, skills and suitable operating rules. The aim is an Agent that works closer to your actual needs, rather than giving generic replies.",
      },
      {
        q: "Does the program include automation?",
        a: "Yes, in a way that fits the problem. You identify steps that can be automated, connect the Agent to a workflow, and try reducing repeated actions. The program is not designed to build a complete enterprise automation system.",
      },
      {
        q: "What will I leave with?",
        a: "You work toward a personalised Hermes AI Agent, a workflow for a specific group of tasks, and a method for continuing to test, adjust and develop the system after the program.",
      },
    ],
    infoCard: true,
    ctaLabel: "REGISTER FOR THIS COURSE",
    seo: {
      title: "AI Agent & Automation | Advanced program | VSC Academy",
      description:
        "Analyse work, design a workflow and build a personalised AI Agent for a real problem, with Hermes as the hands-on environment.",
    },
    pageChrome: {
      audienceEyebrow: "WHO THIS PROGRAM IS FOR",
      audienceTitle: "AI AGENT & AUTOMATION<br>IS A FIT IF...",
      outcomeEyebrow: "LEARNING OUTCOMES",
      outcomeTitle: "WHAT YOU WILL BE ABLE TO DO",
      curriculumEyebrow: "CURRICULUM",
      curriculumTitle: "FROM A WORK PROBLEM<br>TO AN OPERATING AI AGENT",
      outputTitle:
        "YOU DON'T JUST LEARN<br><span>YOU BUILD AN AI AGENT</span><br><span>FOR YOUR OWN WORK</span>",
      outputDescription:
        "During the program, you build and personalise an AI Agent on Hermes, based on a real problem and work context of your own.",
      outputClosing:
        "The Agent can continue to be tested, adjusted and developed after the program.",
      blueprintLabel: "OUTPUT CANVAS · AI AGENT & AUTOMATION",
      blueprintTitle: "A PERSONALISED AI AGENT",
      blueprintResultTitle: "A PERSONALISED AI AGENT",
      blueprintResultNote: "A workflow for a specific group of tasks",
      scheduleIntro:
        "Upcoming AI Agent & Automation classes are updated directly from the VSC Academy schedule.",
      faqTitle: "BEFORE YOU START<br>BUILDING AN<br>AI AGENT",
      faqIntro:
        "A few things worth knowing before you begin building a workflow, automation and an AI Agent for your work.",
    },
  });
})();
