import React, {FC, ReactNode, useEffect, useRef, useState} from 'react'
import PullToRefresh from "../components/PullToRefresh";

const Advertising: React.FC = () => {
    return (
        <PullToRefresh
            onRefresh={async () => {
                console.log(111)
            }}
            headHeight={40}
            threshold={60}
        >
            <div style={{minHeight: '100vh'}}>
                123
            </div>
        </PullToRefresh>
    );
};

export default Advertising;