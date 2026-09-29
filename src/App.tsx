import React, { useState } from 'react';
import { Project, OrderItem } from './types/furniture';
import { INITIAL_PROJECTS, INITIAL_ORDERS } from './data/initialData';
import { Navigation, ActiveTab } from './components/Navigation';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { NewProjectModal } from './components/NewProjectModal';
import { ConstructorWorkspace } from './components/ConstructorWorkspace';
import { ThreeDView } from './components/ThreeDView';
import { MaterialsLibrary } from './components/MaterialsLibrary';
import { DetailingView } from './components/DetailingView';
import { CostEstimateView } from './components/CostEstimateView';
import { OrdersView } from './components/OrdersView';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [currentProject, setCurrentProject] = useState<Project>(INITIAL_PROJECTS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('constructor');
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Update current project and sync list
  const handleUpdateProject = (updated: Project) => {
    setCurrentProject(updated);
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Select project from dashboard or dropdown
  const handleSelectProject = (project: Project, tab?: 'constructor' | '3d' | 'estimate') => {
    setCurrentProject(project);
    if (tab) {
      setActiveTab(tab);
    }
  };

  // Select project by ID (e.g. from Orders)
  const handleSelectProjectById = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setCurrentProject(found);
      setActiveTab('constructor');
    }
  };

  // Create new project
  const handleCreateProject = (newProject: Project) => {
    setProjects([newProject, ...projects]);
    setCurrentProject(newProject);
    setActiveTab('constructor');
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    const filtered = projects.filter((p) => p.id !== projectId);
    setProjects(filtered);
    if (currentProject.id === projectId && filtered.length > 0) {
      setCurrentProject(filtered[0]);
    }
  };

  // Convert project to order from Estimate screen
  const handleCreateOrderFromProject = (proj: Project) => {
    const newOrder: OrderItem = {
      id: 'ord-' + Date.now(),
      orderNumber: `ЗК-2026-${Math.floor(100 + Math.random() * 900)}`,
      projectId: proj.id,
      projectName: proj.name,
      customerName: proj.customerName,
      customerPhone: proj.customerPhone,
      furnitureType: proj.furnitureType,
      status: 'Новые',
      totalPrice: proj.totalPrice || 150000,
      advancePaid: 0,
      deadlineDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      createdAt: new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      responsibleMaster: 'На распределении',
      address: 'Уточняется у заказчика'
    };

    setOrders([newOrder, ...orders]);
    // update project status
    handleUpdateProject({ ...proj, status: 'В производстве' });
    setActiveTab('orders');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8f9fa] text-[#1a1d20]">
      {/* 3-Zone Top Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentProject={currentProject}
        allProjects={projects}
        onSelectProject={(p) => setCurrentProject(p)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
      />

      {/* Main Screen Views */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'projects' && (
          <ProjectsDashboard
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'constructor' && (
          <ConstructorWorkspace
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onNavigateTo3D={() => setActiveTab('3d')}
          />
        )}

        {activeTab === '3d' && (
          <ThreeDView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onSwitchToConstructor={() => setActiveTab('constructor')}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialsLibrary
            project={currentProject}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {activeTab === 'detailing' && (
          <DetailingView project={currentProject} />
        )}

        {activeTab === 'estimate' && (
          <CostEstimateView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onCreateOrderFromProject={handleCreateOrderFromProject}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            projects={projects}
            onSelectProjectById={handleSelectProjectById}
            onUpdateOrders={setOrders}
          />
        )}
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
