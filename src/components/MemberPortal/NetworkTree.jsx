import React, { useState } from 'react';
import { useMlm } from '../../context/MlmContext';
import { maskNameForDeepLevel, maskPhone } from '../../utils/formatters';
import { 
  Users, 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  GitBranch,
  Layers
} from 'lucide-react';

export default function NetworkTree({ memberId }) {
  const { members, currentMember, getMemberById, setCurrentMemberId } = useMlm();
  const [selectedNode, setSelectedNode] = useState(memberId);
  const [expandedNodes, setExpandedNodes] = useState({ [memberId]: true });

  const rootMember = getMemberById(memberId) || currentMember;

  // Toggle node expansion
  const toggleExpand = (id) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Find direct downlines (children in unilevel tree)
  const getDirectChildren = (parentId) => {
    return members.filter(m => m.sponsor_member_id === parentId);
  };

  // Find upline chain
  const getUplineChain = (startId) => {
    const chain = [];
    let cur = getMemberById(startId);
    while (cur && cur.sponsor_member_id) {
      const parent = getMemberById(cur.sponsor_member_id);
      if (!parent) break;
      chain.push(parent);
      cur = parent;
    }
    return chain;
  };

  const uplines = getUplineChain(rootMember.member_id);
  const directChildren = getDirectChildren(rootMember.member_id);

  // Recursive tree renderer
  const renderTreeNode = (mem, level = 0) => {
    const children = getDirectChildren(mem.member_id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes[mem.member_id];
    const isSelf = mem.member_id === rootMember.member_id;

    const displayName = isSelf || level <= 1 ? mem.name : maskNameForDeepLevel(mem.name, level);
    const displayPhone = isSelf ? mem.phone : maskPhone(mem.phone);

    return (
      <div key={mem.member_id} className="tree-node-wrapper">
        <div 
          className={`tree-node-card ${isSelf ? 'tree-node-self' : ''} ${selectedNode === mem.member_id ? 'tree-node-selected' : ''}`}
          onClick={() => setSelectedNode(mem.member_id)}
        >
          <div className="tree-node-header">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(mem.member_id);
                }}
                className="tree-expand-btn"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="tree-leaf-dot" />
            )}

            <div className="tree-avatar">
              {displayName.charAt(0)}
            </div>

            <div className="tree-info">
              <div className="tree-name-row">
                <span className="tree-name">{displayName}</span>
                {isSelf && <span className="self-tag">You</span>}
              </div>
              <div className="tree-code code-font">{mem.referral_code}</div>
            </div>

            <div className="tree-status-badges">
              <span className={`badge ${mem.customer_status === 'active_subscriber' ? 'badge-emerald' : 'badge-neutral'}`}>
                {mem.customer_status === 'active_subscriber' ? 'Active Sub' : 'Registered'}
              </span>
              <span className={`badge ${mem.seller_status === 'active' ? 'badge-cyan' : mem.seller_status === 'pending_KYC' ? 'badge-amber' : 'badge-neutral'}`}>
                {mem.seller_status === 'active' ? 'Seller' : mem.seller_status === 'pending_KYC' ? 'KYC Pending' : 'Customer'}
              </span>
            </div>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="tree-children-branch">
            {children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedMemberDetails = getMemberById(selectedNode);

  return (
    <div className="network-tree-container">
      <div className="network-tree-layout">
        {/* Visual Tree Column */}
        <div className="tree-visual-column glass-panel">
          <div className="tree-toolbar">
            <div className="toolbar-left">
              <GitBranch size={16} className="text-emerald" />
              <h3 className="toolbar-title">Unilevel Sponsor Tree</h3>
            </div>
            <div className="tree-legend">
              <span className="legend-item"><span className="legend-dot dot-emerald" /> Active Subscriber</span>
              <span className="legend-item"><span className="legend-dot dot-cyan" /> Verified Seller</span>
              <span className="legend-item"><span className="legend-dot dot-amber" /> KYC Pending</span>
            </div>
          </div>

          {/* Upline Breadcrumb */}
          {uplines.length > 0 && (
            <div className="upline-breadcrumb-strip">
              <span className="breadcrumb-label">Your Immediate Sponsor:</span>
              <span className="sponsor-name font-semibold text-primary">{uplines[0].name}</span>
              <span className="code-font text-cyan">({uplines[0].referral_code})</span>
            </div>
          )}

          {/* Root node and recursive children */}
          <div className="tree-diagram-canvas">
            {renderTreeNode(rootMember, 0)}
          </div>
        </div>

        {/* Member Details Inspector Column */}
        <div className="tree-details-column glass-panel">
          <div className="inspector-header">
            <Users size={16} className="text-cyan" />
            <h4 className="inspector-title">Genealogy Node Inspector</h4>
          </div>

          {selectedMemberDetails ? (
            <div className="inspector-content">
              <div className="node-profile-box">
                <div className="large-avatar">{selectedMemberDetails.name.charAt(0)}</div>
                <div>
                  <h4 className="profile-name">{selectedMemberDetails.name}</h4>
                  <div className="profile-code code-font">{selectedMemberDetails.referral_code}</div>
                </div>
              </div>

              <div className="inspector-stats-grid">
                <div className="stat-box">
                  <span className="label">Direct Downlines</span>
                  <span className="val">{getDirectChildren(selectedMemberDetails.member_id).length}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Customer Status</span>
                  <span className="val text-emerald">
                    {selectedMemberDetails.customer_status === 'active_subscriber' ? 'Active' : 'Unsubscribed'}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="label">Seller Status</span>
                  <span className="val text-cyan">{selectedMemberDetails.seller_status}</span>
                </div>
                <div className="stat-box">
                  <span className="label">KYC Verified</span>
                  <span className="val">
                    {selectedMemberDetails.kyc?.verification_status === 'verified' ? 'Yes (PAN Valid)' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="privacy-compliance-notice">
                <ShieldCheck size={14} className="text-emerald" />
                <span>
                  <strong>Privacy Protected:</strong> In compliance with direct selling confidentiality guidelines, 
                  deep level personal identifiers (PAN, full mobile) are masked.
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-inspector">Click any node in the tree to view member genealogy details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
