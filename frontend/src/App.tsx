import './App.css'
import { Routes, Route } from 'react-router-dom'
import Layout from '@/layout/Layout'
import Home from '@/pages/Home'
import Products from '@/pages/Products'
import Categories from '@/pages/Categories'
import Users from '@/pages/Users'
import Login from './pages/Login'
import { Promos } from './pages/Promos'
import FAQ from './pages/FAQ'
import { Sales } from './pages/Sales'
import Business from './pages/Business'
import Colors from './pages/Colors'
export default function App() {
  return (
      <Routes>
        <Route path='/auth' element={<Login />} />
        <Route path="/" element={<Layout />}> 
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="users" element={<Users />} />
          <Route path="sales" element={<Sales />} />
          <Route path="promos" element={<Promos />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="business" element={<Business />} />
          <Route path="colors" element={<Colors />} />
          
        </Route>
      </Routes>
  )
}
