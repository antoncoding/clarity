const config = {
    appName: "SolopreneurCrypto",
    appDescription:
      "Dashboard of the new project.",
    domainName:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "http://localhost:3000",
  };
  
  export default config;