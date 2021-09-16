import React from 'react'
import LoginGithub from 'react-login-github'
import lang from 'samples/lang'
import PropTypes from 'prop-types'
import 'animate.css'

const LoginUser = props => {

  const { userAuth } = props
  const [ isLogging, setLogging ] = React.useState(false)

  const onSuccess = res => {

    if (!res.code) return
    userAuth(res.code)
  }

  const onFailure = (err) => {
    console.log('errorAuth:', err)
    setLogging(false)
  }

  const onRequest = () => {
    setLogging(true)
  }

  return (
    <div className="auth animate__animated animate__fadeInUp">
      <LoginGithub
      className="btn btn-primary rounded3 col-12"
      buttonText={isLogging ? lang.isLogging : lang.loginViaGithub}
      clientId={process.env.REACT_APP_GITHUB_CLIENT_ID}
      onSuccess={onSuccess}
      onFailure={onFailure}
      onRequest={onRequest}
      disabled={isLogging}
      />
    </div>
  )
}

LoginUser.propTypes = {
  userAuth: PropTypes.func,
}

export default LoginUser