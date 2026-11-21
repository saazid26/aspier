import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{error?:Error}> {
  state:{error?:Error} = {};
  static getDerivedStateFromError(error:Error){return {error}}
  componentDidCatch(error:Error,_info:ErrorInfo){console.error(error,_info)}
  render(){return this.state.error?<main className="container section"><h1>Something went wrong</h1><p className="muted">{this.state.error.message}</p></main>:this.props.children}
}
