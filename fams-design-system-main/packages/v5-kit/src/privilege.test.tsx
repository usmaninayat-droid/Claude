import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { PrivilegeProvider, Privileged, usePrivilege, type PrivilegeContextValue } from './privilege'

function wrap(value: PrivilegeContextValue, ui: React.ReactNode) {
  return render(<PrivilegeProvider value={value}>{ui}</PrivilegeProvider>)
}

function Probe({ required }: { required: string[] }) {
  const allowed = usePrivilege(required)
  return <span data-testid="probe">{allowed ? 'yes' : 'no'}</span>
}

describe('usePrivilege — v5 semantics', () => {
  it('ANDs required permissions (every must be present)', () => {
    const value = { privileges: ['a', 'b'], userType: 'user' }
    wrap(value, <Probe required={['a', 'b']} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')
  })

  it('fails when any required permission is missing', () => {
    wrap({ privileges: ['a'], userType: 'user' }, <Probe required={['a', 'b']} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('no')
  })

  it('empty required always passes', () => {
    wrap({ privileges: [], userType: 'user' }, <Probe required={[]} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')
  })

  it('bypasses all checks when userType !== "user"', () => {
    wrap({ privileges: [], userType: 'superadmin' }, <Probe required={['a', 'b', 'c']} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')
  })

  it('does not collide for privilege codes containing spaces (memo key regression)', () => {
    // ['fleet.read', 'x'] vs a required set of ['fleet', 'read.x'] would join
    // to the same string under a naive `.join(' ')` memo key. The user only
    // holds 'fleet.read' + 'x' — not the literal 'fleet' and 'read.x' codes —
    // so this must fail even though the joined strings would have matched.
    wrap({ privileges: ['fleet.read', 'x'], userType: 'user' }, <Probe required={['fleet', 'read.x']} />)
    expect(screen.getByTestId('probe')).toHaveTextContent('no')
  })

  it('is REACTIVE — recomputes when the context value changes (v5 was mount-only)', () => {
    function Harness() {
      const [privs, setPrivs] = useState<string[]>([])
      return (
        <PrivilegeProvider value={{ privileges: privs, userType: 'user' }}>
          <button onClick={() => setPrivs(['a'])}>grant</button>
          <Probe required={['a']} />
        </PrivilegeProvider>
      )
    }
    render(<Harness />)
    expect(screen.getByTestId('probe')).toHaveTextContent('no')
    fireEvent.click(screen.getByText('grant'))
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')
  })

  it('is REACTIVE on revoke — recomputes when a privilege is removed while mounted', () => {
    function Harness() {
      const [privs, setPrivs] = useState<string[]>(['a'])
      return (
        <PrivilegeProvider value={{ privileges: privs, userType: 'user' }}>
          <button onClick={() => setPrivs([])}>revoke</button>
          <Probe required={['a']} />
        </PrivilegeProvider>
      )
    }
    render(<Harness />)
    expect(screen.getByTestId('probe')).toHaveTextContent('yes')
    fireEvent.click(screen.getByText('revoke'))
    expect(screen.getByTestId('probe')).toHaveTextContent('no')
  })
})

describe('<Privileged>', () => {
  it('renders children when allowed', () => {
    wrap(
      { privileges: ['x'], userType: 'user' },
      <Privileged required={['x']}>
        <p>secret</p>
      </Privileged>,
    )
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('renders nothing (null) by default when denied — subtree not mounted', () => {
    wrap(
      { privileges: [], userType: 'user' },
      <Privileged required={['x']}>
        <p>secret</p>
      </Privileged>,
    )
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('renders the fallback when denied and one is provided', () => {
    wrap(
      { privileges: [], userType: 'user' },
      <Privileged required={['x']} fallback={<p>denied</p>}>
        <p>secret</p>
      </Privileged>,
    )
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.getByText('denied')).toBeInTheDocument()
  })

  it('is REACTIVE on revoke — unmounts children and shows fallback when privilege is removed while mounted', () => {
    function Harness() {
      const [privs, setPrivs] = useState<string[]>(['x'])
      return (
        <PrivilegeProvider value={{ privileges: privs, userType: 'user' }}>
          <button onClick={() => setPrivs([])}>revoke</button>
          <Privileged required={['x']} fallback={<p>denied</p>}>
            <p>secret</p>
          </Privileged>
        </PrivilegeProvider>
      )
    }
    render(<Harness />)
    expect(screen.getByText('secret')).toBeInTheDocument()
    fireEvent.click(screen.getByText('revoke'))
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.getByText('denied')).toBeInTheDocument()
  })
})
