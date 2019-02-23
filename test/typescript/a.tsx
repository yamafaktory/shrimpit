import * as React from 'react'

interface IProps {
  text?: string
  onClick: SomeTypingThatWillBreakIfUsingFlowInsteadOfTypeScript
}

const Foo = ({ text, onClick }: IProps) => <div onClick={onClick}>{text}</div>

export default Foo
