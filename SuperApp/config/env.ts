// Environment configuration

const ENV = {
  dev: {
    apiUrl: 'https://bw6z7nqh-8080.asse.devtunnels.ms',
  },
  staging: {
    apiUrl: 'https://staging-api.yourdomain.com',
  },
  prod: {
    apiUrl: 'https://api.yourdomain.com',
  },
};

const getEnvVars = () => {
  // __DEV__ is true when running in development
  if (__DEV__) {
    return ENV.dev;
  }
  // You can add more conditions based on your needs
  return ENV.prod;
};

export default getEnvVars();
