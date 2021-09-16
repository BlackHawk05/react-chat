import axios from 'axios'

const userAuth = async authCode => {
  return await authToken(authCode)
}

const authToken = async authCode => {
  const requestData = {
    client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
    client_secret: process.env.REACT_APP_GITHUB_CLIENT_SECRET,
    code: authCode,
    redirect_uri: `${process.env.REACT_APP_CLIENT_HOST}/authchat`
  };

  const res = await axios.post('https://github.com/login/oauth/access_token', requestData, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  })

  if (res && res.data && res.data.access_token) {
    return getUser(res.data.access_token)
  }
}

const getUser = async accessToken => {
  const res = await axios.get('https://api.github.com/user', {
    headers: {
      'Authorization': `token  ${accessToken}`
    }
  })

  if (res && res.data) {
    //console.log('userData1:', res.data)
    const userData = {
      login: res.data.login, 
      email: res.data.email, 
      name: res.data.name,
      avatar: res.data.avatar_url
    }
    return userData
  }
}

export default userAuth