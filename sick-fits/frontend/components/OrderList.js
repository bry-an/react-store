import React, { Component } from 'react'
import { Query } from 'react-apollo'
import { formatDistance } from 'date-fns'
import Link from 'next/link'
import styled from 'styled-components'
import gql from 'graphql-tag'
import formatMoney from '../lib/formatMoney'
import OrderItemStyles from './styles/OrderItemStyles'

class OrderList extends Component {
  render() {
    return (
        <p>Order List</p>
    )
  }
}

export default OrderList