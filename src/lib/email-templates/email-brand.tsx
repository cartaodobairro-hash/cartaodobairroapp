import * as React from 'react'
import { Img, Section } from '@react-email/components'

export function BrandHeader() {
  return (
    <Section style={header}>
      <Img
        src="https://cartaodobairro.online/app-icon-512.png"
        width="112"
        height="112"
        alt="Cartão do Bairro"
        style={logo}
      />
    </Section>
  )
}

const header = { padding: '0 0 20px' }
const logo = { display: 'block', borderRadius: '16px' }
