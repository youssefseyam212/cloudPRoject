const awsExports = {
  Auth: {
    region: 'eu-north-1',
    userPoolId: 'eu-north-1_DPCOuYG5a',
    userPoolWebClientId: '7e50iclk2vm1fdme4nktf9gnik',
    oauth: {
      domain: 'dpcouyg5a.auth.eu-north-1.amazoncognito.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'https://13.60.76.231:5173/', // Fix colon (not semicolon)
      redirectSignOut: 'https://13.60.76.231:5173/',
      responseType: 'code'
    }
  }
};
export default awsExports;