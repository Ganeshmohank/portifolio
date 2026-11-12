// Everything the "Ask" section knows. Written only from the site and Mohan's résumé.
export const CORPUS = [
  { title: 'About', href: '#about', text: "Mohan is a Staff Software Engineer who loves building systems that actually work at scale. He finished a Master's at San Jose State in May 2026 and has shipped enterprise software at Palo Alto Networks, ServiceNow and NatWest. He takes ownership from idea to production and cares deeply about code quality." },
  { title: 'Hard problems', href: '#about', text: 'He gets excited about hard problems: making LLMs more reliable, squeezing out latency, and keeping systems up when traffic spikes.' },
  { title: 'Location', href: '#contact', text: 'Mohan is based in the San Francisco Bay Area, in San Jose, USA.' },
  { title: 'Contact', href: '#contact', text: 'The best way to reach Mohan is by email at mohankancherla2023@gmail.com. He is also on LinkedIn and GitHub.' },

  { title: 'Palo Alto Networks role', href: '#work', text: 'Mohan is a Staff Software Engineer at Palo Alto Networks, in CyberArk R&D, working on Machine Identity Management since June 2026 in Santa Clara. This is his cybersecurity work: he helps secure machines, services and agents through their identities and certificates.' },
  { title: 'Machine identity work', href: '#work', text: 'He works on machine identity features end to end, from schema and backend APIs to the customer-facing UI, including granular access groups for least-privilege access, and audit logging.' },

  { title: 'ServiceNow role', href: '#servicenow', text: 'Mohan was a Software Engineer at ServiceNow from May 2025 to May 2026, on the internal AI platform for developer productivity. He shipped a RAG-powered support agent using an MCP tool server.' },
  { title: 'ServiceNow results', href: '#servicenow', text: 'The support agent resolved 2.6k recurring tickets, reaching 31% deflection and freeing 400 engineering hours a quarter.' },
  { title: 'ServiceNow guards', href: '#servicenow', text: 'He added validation of structure and facts on every answer, which lowered the hallucination rate by 37%.' },
  { title: 'ServiceNow model routing', href: '#servicenow', text: 'Low-risk asks were routed to faster models. Median latency fell from 9.3s to 5.7s and token spend dropped 22%.' },
  { title: 'ServiceNow memory', href: '#servicenow', text: 'A context memory layer retains ticket history. One-touch resolutions rose from 54% to 82% and handle time fell 18%.' },
  { title: 'Retrieval pipeline', href: '#servicenow', text: 'He built a multi-stage retrieval pipeline with semantic chunking of 512 tokens and 20% overlap, hybrid dense and BM25 search, and cross-encoder re-ranking. It improved relevance 41% over vector-only search.' },
  { title: 'MCP tool server', href: '#servicenow', text: 'He built a shared MCP tool server wrapping 8 ServiceNow APIs with JSON-schema contracts, so LangGraph agents could discover and invoke tools. It cut new-tool integration time by 2 days.' },
  { title: 'Defect-management agent', href: '#servicenow', text: 'He built a defect-management agent on LangGraph state machines with conditional routing, context-aware triage and escalation guardrails. It completed 600+ multi-step workflows without human fallback.' },

  { title: 'NatWest role', href: '#natwest', text: 'Mohan was a Software Engineer at NatWest Group in Bangalore from July 2022 to July 2024, in retail banking. He worked on chat support across 3 banking platforms.' },
  { title: 'NatWest performance', href: '#natwest', text: 'He cached SQL query results in Redis and queued work with RabbitMQ, which cut response times by 40% under high load. He resolved Redis standby mode during high traffic with leaky-bucket rate limiting, keeping CPU below 70%.' },
  { title: 'NatWest chatbot', href: '#natwest', text: "He worked on the in-house chatbot's React client, adding 5+ features including enhanced accessibility. The multi-channel chat solution boosted user satisfaction by 40% and reduced manual chat closures by 25%." },
  { title: 'NatWest tooling', href: '#natwest', text: 'He built a scaffolding CLI that summarises 200+ daily test packs into a dashboard, saving the testing team over 4 hours a day.' },
  { title: 'NatWest DevOps', href: '#natwest', text: 'He automated infrastructure with Terraform and deployed on AWS ECS, cutting deployment time by 50%.' },
  { title: 'NatWest awards', href: '#honors', text: 'At NatWest he received the Living Our Values Award and won the NatWest Challenge in both FY22 and FY23.' },

  { title: 'Vidrona', href: '#vidrona', text: 'Mohan was a Software Engineer Intern at Vidrona from September 2021 to March 2022, on tower management for towers, poles and other field assets. He built a ReactJS dashboard with Redux and react-query, and a secure messaging widget using Socket.io, Node.js and JWT.' },

  { title: 'Orbit at CalHacks', href: '#achievements', text: 'Orbit won for 3 sponsors at CalHacks 12.0 in 2025, out of 2178+ participants: Fetch.ai, Sim.ai and omi. Orbit is a multi-agent system using LangChain and 4 Composio MCP servers that turns Zoom transcripts into actionable tasks through voice commands on Omi hardware.' },
  { title: 'EduCo', href: '#educo', text: 'EduCo won for 2 sponsors at the Self-Evolving Agents Hackathon in San Francisco in November 2025, out of 140 participants: Airia and Fastino. It is an AI tutor that generates lessons, evaluates answers, understands strengths and weaknesses, and adapts its teaching in real time.' },
  { title: 'Zero Waste Management Club', href: '#honors', text: 'He founded and chaired the Zero Waste Management Club at VIT Vellore in 2019, which grew to 200+ active members working on waste research and projects.' },

  { title: 'Augmented reality', href: '#ar', text: 'Augmented reality is his hidden talent and underrated skill. Mohan has built marker tracking and location-based AR experiences for the web.' },

  { title: 'Meeting Intelligence', href: '#projects', text: 'Meeting Intelligence is a full-stack app for meeting ingestion, transcripts and action-item review, built with FastAPI, MongoDB and React.' },
  { title: 'Parallel Kafka Consumer', href: '#projects', text: 'Parallel Kafka Consumer is a custom Kafka consumer written in Go with built-in concurrency management, graceful shutdowns and group rebalancing. It builds on franz-go.' },
  { title: 'P2PFile', href: '#projects', text: 'P2PFile is a decentralized, peer-to-peer content-addressable storage system built in Go, for distributing and retrieving data across a network of nodes.' },
  { title: 'S3 Plato', href: '#projects', text: 'S3 Plato is an S3 manager written in TypeScript.' },
  { title: 'StudyX', href: '#projects', text: 'StudyX is a study chat bot written in Python.' },
  { title: 'IChat', href: '#projects', text: 'IChat is a real-time chat and voice platform written in JavaScript.' },
  { title: 'CLI Chat', href: '#projects', text: 'CLI Chat is a chat app for the terminal, written in C++.' },
  { title: 'Finance', href: '#projects', text: 'Finance is an app to visualise and plan EMIs, built for a NatWest hackathon.' },
  { title: 'Prodo', href: '#projects', text: 'Prodo is an online platform for perfumes built in Java.' },
  { title: 'Employee Management', href: '#projects', text: 'Employee Management helps manage a workforce, built with Angular and Spring Boot.' },
  { title: 'Other projects', href: '#projects', text: 'Other projects include Stock Prediction and Hotel Mania, both written in JavaScript.' },

  { title: 'Languages', href: '#resume', text: 'His languages are Python, Java, Go and JavaScript with Node.js, plus TypeScript.' },
  { title: 'Agent and LLM skills', href: '#resume', text: 'For agents and LLMs he works with MCP tool servers, function calling, multi-agent orchestration, RAG, hybrid retrieval, cross-encoder re-ranking, LangGraph, LangChain, Semantic Kernel, the Anthropic Claude API, the OpenAI API and Composio.' },
  { title: 'Back end skills', href: '#resume', text: 'On the back end he uses FastAPI, Spring Boot, Express.js, REST and GraphQL API design, Kafka and RabbitMQ.' },
  { title: 'Data skills', href: '#resume', text: 'For data and retrieval he uses PostgreSQL, MongoDB, Redis, and vector databases such as Pinecone and Chroma.' },
  { title: 'Cloud skills', href: '#resume', text: 'For cloud and DevOps he uses AWS including ECS and CDK, Docker, Kubernetes, Terraform, GitHub Actions and Jenkins. He is an AWS Certified Solutions Architect Associate.' },
  { title: 'Front end skills', href: '#resume', text: 'On the front end he uses React, Angular and Redux, with attention to accessibility.' },

  { title: 'Masters', href: '#sjsu', text: "He graduated from San Jose State University, a Spartan, with a Master of Science in Computer Software Engineering in May 2026, with a 3.8 GPA. His coursework included distributed systems, machine learning and deep learning." },
  { title: 'Bachelors', href: '#resume', text: "He earned a Bachelor's in Electronics and Communication Engineering at Vellore Institute of Technology from 2018 to 2022, graduating with distinction." },

  { title: 'Flit Taxi case study', href: '#case', text: 'Flit Taxi is a product design case study on an all-in-one taxi and delivery app with a commission-free model, from research and interviews to usability testing and final interface.' },
  { title: 'Design work', href: '#case', text: 'His design work in Figma includes Design VNS, an energy asset management application for powerlines, and a design plan for a chat platform.' },

  { title: 'ServiceNow recommendation', href: '#kudos', text: "Santosh Poreddy, Mohan's Software Engineering Manager at ServiceNow, wrote that he does not wait for step-by-step direction, takes ownership, asks the right questions and moves with urgency." },
  { title: 'Recommendation', href: '#kudos', text: "Nitesh Kumar, Mohan's first line manager, wrote that Mohan is undoubtedly an asset to any team or company, and that he consistently brings dedication, skill, and a collaborative spirit." },
];
